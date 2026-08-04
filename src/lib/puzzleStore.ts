/**
 * Server-side resolution of IdeaBridge answers.
 *
 * The browser only ever receives the answer-free `Puzzle` shape, so the server
 * needs to be able to go from a puzzle id back to the full puzzle when
 * validating a guess, serving a hint, or revealing the solution.
 *
 * Curated puzzles resolve straight out of `puzzles.json`. AI-generated puzzles
 * have no durable home, so they live in a small in-memory LRU. That cache is
 * per-instance and evictable — callers must handle a miss.
 */

import puzzlesData from '@/data/puzzles.json'
import type { FullPuzzle, Puzzle, Solution } from '@/types/bridge'

const curated = puzzlesData as Omit<FullPuzzle, 'source'>[]

// AI puzzles are ephemeral; a few hundred is far more than a single instance
// will have in flight, and eviction just costs the player a hint.
const AI_CACHE_LIMIT = 500
const aiCache = new Map<string, FullPuzzle>()

export function rememberAIPuzzle(puzzle: FullPuzzle): void {
  aiCache.set(String(puzzle.id), puzzle)
  while (aiCache.size > AI_CACHE_LIMIT) {
    const oldest = aiCache.keys().next().value
    if (oldest === undefined) break
    aiCache.delete(oldest)
  }
}

export function getFullPuzzle(id: string | number): FullPuzzle | null {
  const key = String(id)
  const fromCache = aiCache.get(key)
  if (fromCache) return fromCache

  const match = curated.find(p => String(p.id) === key)
  return match ? { ...match, source: 'curated' } : null
}

export function getCuratedPuzzle(index: number): FullPuzzle {
  const p = curated[index % curated.length]
  return { ...p, source: 'curated' }
}

export const curatedCount = curated.length

/** Strip every answer-bearing field before the puzzle crosses to the client. */
export function toClientPuzzle(p: FullPuzzle): Puzzle {
  return {
    id: p.id,
    difficulty: p.difficulty,
    start: p.start,
    target: p.target,
    stepCount: p.steps.length,
    source: p.source,
  }
}

export function toSolution(p: FullPuzzle): Solution {
  return {
    chain: [p.start, ...p.steps.map(s => s.correct)],
    fact: p.fact,
  }
}
