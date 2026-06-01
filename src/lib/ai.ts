/**
 * AI provider abstraction for Loft.
 *
 * Priority order (first configured key wins):
 *   1. NVIDIA NIM  — set NVIDIA_NIM_API_KEY
 *   2. Anthropic   — set ANTHROPIC_API_KEY
 *   3. None        — IdeaBridge validation falls back to exact-match only;
 *                    AI puzzle generation returns null (caller uses curated)
 *
 * Override the NIM model with NVIDIA_NIM_MODEL env var.
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { Puzzle } from '@/types/bridge'

// ── Provider detection ─────────────────────────────────────────────────────

export type AIProvider = 'nvidia-nim' | 'anthropic' | 'none'

export function getAIProvider(): AIProvider {
  if (process.env.NVIDIA_NIM_API_KEY) return 'nvidia-nim'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'none'
}

// ── NVIDIA NIM (OpenAI-compatible) ─────────────────────────────────────────

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const NIM_DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct'

function getNimModel(): string {
  return process.env.NVIDIA_NIM_MODEL ?? NIM_DEFAULT_MODEL
}

let _nim: OpenAI | null = null
function nimClient(): OpenAI {
  _nim ??= new OpenAI({
    apiKey: process.env.NVIDIA_NIM_API_KEY!,
    baseURL: NIM_BASE_URL,
  })
  return _nim
}

// ── Anthropic ──────────────────────────────────────────────────────────────

const ANTHROPIC_FAST_MODEL  = 'claude-haiku-4-5-20251001'
const ANTHROPIC_SMART_MODEL = 'claude-sonnet-4-6'

let _anthropic: Anthropic | null = null
function anthropicClient(): Anthropic {
  _anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

// ── JSON extraction helper ─────────────────────────────────────────────────
// Some models wrap JSON in markdown fences or add commentary — this strips it.

function extractJSON(raw: string): unknown {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch { /* try extraction */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) { try { return JSON.parse(fenced[1]) } catch { /* continue */ } }
  const braced = trimmed.match(/\{[\s\S]*\}/)
  if (braced) { try { return JSON.parse(braced[0]) } catch { /* continue */ } }
  throw new Error(`Could not extract JSON from: ${raw.slice(0, 200)}`)
}

// ── validateBridgeStep ─────────────────────────────────────────────────────

export interface BridgeValidation {
  valid: boolean
  canonical: string | null
  explanation: string
}

const VALIDATE_SYSTEM =
  'You are a word association validator. Reply only with a JSON object matching: ' +
  '{ "valid": boolean, "canonical": string | null, "explanation": string }'

function validatePrompt(from: string, userInput: string, targetWord: string): string {
  return (
    `Is "${userInput}" a reasonable associative bridge from "${from}" toward "${targetWord}"?\n` +
    `The curated correct answer is "${targetWord}".\n` +
    `If the user's word is the same concept as "${targetWord}" (accounting for synonyms and casing), ` +
    `set canonical to "${targetWord}".\n` +
    `Return JSON: { "valid": boolean, "canonical": string | null, "explanation": string }`
  )
}

async function validateWithNim(params: {
  from: string; userInput: string; targetWord: string
}): Promise<BridgeValidation> {
  const resp = await nimClient().chat.completions.create({
    model: getNimModel(),
    messages: [
      { role: 'system', content: VALIDATE_SYSTEM },
      { role: 'user',   content: validatePrompt(params.from, params.userInput, params.targetWord) },
    ],
    max_tokens: 256,
    temperature: 0.1,
  })
  return extractJSON(resp.choices[0]?.message?.content ?? '{}') as BridgeValidation
}

async function validateWithAnthropic(params: {
  from: string; userInput: string; targetWord: string
}): Promise<BridgeValidation> {
  const msg = await anthropicClient().messages.create({
    model: ANTHROPIC_FAST_MODEL,
    max_tokens: 256,
    system: VALIDATE_SYSTEM,
    messages: [{ role: 'user', content: validatePrompt(params.from, params.userInput, params.targetWord) }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  return extractJSON(text) as BridgeValidation
}

/** Exact-match fallback — used when no AI is configured or all providers fail. */
function validateExact(params: { userInput: string; targetWord: string }): BridgeValidation {
  const isMatch =
    params.userInput.trim().toLowerCase() === params.targetWord.trim().toLowerCase()
  return {
    valid: isMatch,
    canonical: isMatch ? params.targetWord : null,
    explanation: isMatch
      ? 'Correct!'
      : `No AI configured — only the exact answer is accepted.`,
  }
}

export async function validateBridgeStep(params: {
  from: string
  userInput: string
  targetWord: string
}): Promise<BridgeValidation> {
  const provider = getAIProvider()
  try {
    if (provider === 'nvidia-nim') return await validateWithNim(params)
    if (provider === 'anthropic')  return await validateWithAnthropic(params)
  } catch (err) {
    console.error(`[ai] validateBridgeStep (${provider}) failed:`, err)
    // Fall through to exact match
  }
  return validateExact(params)
}

// ── generateAIPuzzle ───────────────────────────────────────────────────────

const GENERATE_SYSTEM =
  'You are a creative word-chain puzzle designer. Reply only with valid JSON.'

const GENERATE_PROMPT =
  'Generate a word association chain puzzle connecting two unrelated concepts.\n' +
  'Return JSON exactly matching this schema:\n' +
  '{\n' +
  '  "start": "string",\n' +
  '  "target": "string",\n' +
  '  "difficulty": "easy" | "medium" | "hard",\n' +
  '  "steps": [{ "correct": "string", "options": ["correct","wrong1","wrong2","wrong3"], "explain": "string" }],\n' +
  '  "fact": "string"\n' +
  '}\n' +
  'Create 3–5 steps. Make the lateral connections clever but fair. Wrong options should be plausible on first read but clearly incorrect on reflection.'

async function generateWithNim(): Promise<Puzzle> {
  const resp = await nimClient().chat.completions.create({
    model: getNimModel(),
    messages: [
      { role: 'system', content: GENERATE_SYSTEM },
      { role: 'user',   content: GENERATE_PROMPT },
    ],
    max_tokens: 1024,
    temperature: 0.9,
  })
  const parsed = extractJSON(resp.choices[0]?.message?.content ?? '')
  return { id: `ai-nim-${Date.now()}`, source: 'ai', ...(parsed as object) } as Puzzle
}

async function generateWithAnthropic(): Promise<Puzzle> {
  const msg = await anthropicClient().messages.create({
    model: ANTHROPIC_SMART_MODEL,
    max_tokens: 1024,
    system: GENERATE_SYSTEM,
    messages: [{ role: 'user', content: GENERATE_PROMPT }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const parsed = extractJSON(text)
  return { id: `ai-anthropic-${Date.now()}`, source: 'ai', ...(parsed as object) } as Puzzle
}

/**
 * Returns null when no AI is configured — callers should fall back to curated puzzles.
 */
export async function generateAIPuzzle(): Promise<Puzzle | null> {
  const provider = getAIProvider()
  try {
    if (provider === 'nvidia-nim') return await generateWithNim()
    if (provider === 'anthropic')  return await generateWithAnthropic()
  } catch (err) {
    console.error(`[ai] generateAIPuzzle (${provider}) failed:`, err)
  }
  return null
}
