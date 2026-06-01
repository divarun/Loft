'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getDayNumber } from '@/lib/dayNumber'
import type { Puzzle, BridgeState, HistoryRecord } from '@/types/bridge'

export type IdeaBridgeMode = 'daily' | 'practice' | 'ai'

export interface ExtendedBridgeState extends BridgeState {
  validationError: string | null
  history: HistoryRecord[]
  dailyDone: boolean
  dailyResult: 'won' | 'lost' | null
  shareText: string
  stepExplain: string | null
  wrongFeedback: string | null
  hint: string | null
  totalWrong: number
}

export interface IdeaBridgeActions {
  submitWord: (input: string) => Promise<void>
  useHint: () => void
  skipPuzzle: () => void
  nextPuzzle: () => void
  setMode: (mode: IdeaBridgeMode) => void
  copyShare: () => Promise<void>
  loadPuzzle: () => void
}

const INITIAL_SCORE = 1000
const WRONG_PENALTY = 100
const HINT_PENALTY = 200
const HISTORY_KEY = 'ib_history'
const STREAK_KEY = 'ib_streak'

function dailyKey(day: number) {
  return `ib_daily_${day}`
}

function buildShareText(
  puzzle: Puzzle,
  chain: string[],
  score: number,
  streak: number,
  dayNumber: number,
  won: boolean,
): string {
  const chainStr = chain.map(w => w.toUpperCase()).join(' → ')
  const hops = chain.length - 1
  const result = won ? '✅' : '❌'
  return [
    `IdeaBridge ⛓️ [Daily #${dayNumber}]`,
    chainStr,
    `${result} ${hops} hop${hops !== 1 ? 's' : ''} · Score: ${score}`,
    `🔥 Streak: ${streak}`,
  ].join('\n')
}

export function useIdeaBridge(): ExtendedBridgeState & IdeaBridgeActions {
  const dayNumber = getDayNumber()

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [step, setStep] = useState(0)
  const [chain, setChain] = useState<string[]>([])
  const [score, setScore] = useState(INITIAL_SCORE)
  const [totalWrong, setTotalWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)
  const [mode, setModeState] = useState<IdeaBridgeMode>('daily')
  const [hintUsed, setHintUsed] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [stepExplain, setStepExplain] = useState<string | null>(null)
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [dailyDone, setDailyDone] = useState(false)
  const [dailyResult, setDailyResult] = useState<'won' | 'lost' | null>(null)
  const [shareText, setShareText] = useState('')
  const [loading, setLoading] = useState(false)

  const explainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load history and streak from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw) as HistoryRecord[])
      const s = localStorage.getItem(STREAK_KEY)
      if (s) setStreak(parseInt(s, 10) || 0)
    } catch {
      // ignore
    }
  }, [])

  const fetchPuzzle = useCallback(async (m: IdeaBridgeMode) => {
    if (loading) return
    setLoading(true)
    setValidationError(null)
    try {
      const res = await fetch(`/api/puzzle?mode=${m}`)
      if (!res.ok) throw new Error('Failed to fetch puzzle')
      const p = (await res.json()) as Puzzle
      setPuzzle(p)
      setChain([p.start])
      setStep(0)
      setScore(INITIAL_SCORE)
      setTotalWrong(0)
      setDone(false)
      setHintUsed(false)
      setHint(null)
      setStepExplain(null)
      setWrongFeedback(null)
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to load puzzle')
    } finally {
      setLoading(false)
    }
  }, [loading])

  const loadPuzzle = useCallback(() => {
    fetchPuzzle(mode)
  }, [fetchPuzzle, mode])

  // Load puzzle on mount and when mode changes
  useEffect(() => {
    if (mode === 'daily') {
      const saved = localStorage.getItem(dailyKey(dayNumber))
      if (saved === 'won' || saved === 'lost') {
        setDailyDone(true)
        setDailyResult(saved)
      }
    }
    fetchPuzzle(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const endPuzzle = useCallback(
    (
      won: boolean,
      finalChain: string[],
      finalScore: number,
      puzzle: Puzzle,
      currentStreak: number,
      finalWrong: number,
    ) => {
      setDone(true)

      const newStreak = won ? currentStreak + 1 : 0
      setStreak(newStreak)

      if (mode === 'daily') {
        const result = won ? 'won' : 'lost'
        localStorage.setItem(dailyKey(dayNumber), result)
        setDailyDone(true)
        setDailyResult(result)
      }

      const record: HistoryRecord = {
        id: puzzle.id,
        start: puzzle.start,
        target: puzzle.target,
        chain: finalChain,
        score: finalScore,
        hops: finalChain.length - 1,
        wrong: finalWrong,
        won,
        date: new Date().toISOString().split('T')[0],
        mode,
      }
      const newHistory = [record, ...history].slice(0, 15)
      setHistory(newHistory)

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
        localStorage.setItem(STREAK_KEY, String(newStreak))
      } catch {
        // ignore
      }

      const text = buildShareText(puzzle, finalChain, finalScore, newStreak, dayNumber, won)
      setShareText(text)
    },
    [mode, dayNumber, history],
  )

  const submitWord = useCallback(
    async (input: string) => {
      if (!puzzle || validating || done) return
      const trimmed = input.trim()
      if (!trimmed) return

      const currentStep = puzzle.steps[step]
      if (!currentStep) return

      setValidating(true)
      setWrongFeedback(null)
      setValidationError(null)

      try {
        const res = await fetch('/api/validate-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: chain[chain.length - 1],
            userInput: trimmed,
            targetWord: currentStep.correct,
          }),
        })
        if (!res.ok) throw new Error('Validation request failed')
        const data = (await res.json()) as {
          valid: boolean
          canonical: string | null
          explanation: string
        }

        if (data.valid) {
          const wordToAdd = data.canonical ?? currentStep.correct
          const newChain = [...chain, wordToAdd]
          setChain(newChain)
          setHint(null)
          setHintUsed(false)

          // Show step explanation briefly
          setStepExplain(currentStep.explain)
          if (explainTimerRef.current) clearTimeout(explainTimerRef.current)
          explainTimerRef.current = setTimeout(() => {
            setStepExplain(null)
            const nextStep = step + 1
            if (nextStep >= puzzle.steps.length) {
              endPuzzle(true, newChain, score, puzzle, streak, totalWrong)
            } else {
              setStep(nextStep)
            }
          }, 1100)
        } else {
          const newScore = Math.max(0, score - WRONG_PENALTY)
          const newWrong = totalWrong + 1
          setScore(newScore)
          setTotalWrong(newWrong)
          setWrongFeedback(data.explanation || 'Not quite — try a different connection.')
          if (newScore <= 0) {
            const correctChain = [
              puzzle.start,
              ...puzzle.steps.map(s => s.correct),
            ]
            endPuzzle(false, correctChain, 0, puzzle, streak, newWrong)
          }
        }
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : 'Validation failed')
      } finally {
        setValidating(false)
      }
    },
    [puzzle, validating, done, step, chain, score, totalWrong, streak, endPuzzle],
  )

  const useHint = useCallback(() => {
    if (!puzzle || done || hintUsed) return
    const currentStep = puzzle.steps[step]
    if (!currentStep) return
    const newScore = Math.max(0, score - HINT_PENALTY)
    setScore(newScore)
    setHintUsed(true)
    setHint(currentStep.correct)
    if (newScore <= 0) {
      const correctChain = [puzzle.start, ...puzzle.steps.map(s => s.correct)]
      endPuzzle(false, correctChain, 0, puzzle, streak, totalWrong)
    }
  }, [puzzle, done, hintUsed, step, score, streak, totalWrong, endPuzzle])

  const skipPuzzle = useCallback(() => {
    if (!puzzle) return
    const correctChain = [puzzle.start, ...puzzle.steps.map(s => s.correct)]
    endPuzzle(false, correctChain, 0, puzzle, streak, totalWrong)
  }, [puzzle, streak, totalWrong, endPuzzle])

  const nextPuzzle = useCallback(() => {
    const nextMode = mode === 'daily' ? 'practice' : mode
    if (nextMode !== mode) {
      setModeState(nextMode)
    } else {
      fetchPuzzle(nextMode)
    }
  }, [mode, fetchPuzzle])

  const setMode = useCallback((m: IdeaBridgeMode) => {
    setModeState(m)
  }, [])

  const copyShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      // fallback: select text
    }
  }, [shareText])

  return {
    puzzle,
    step,
    chain,
    score,
    totalWrong,
    streak,
    done,
    mode,
    hintUsed,
    hint,
    validating,
    validationError,
    stepExplain,
    wrongFeedback,
    history,
    dailyDone,
    dailyResult,
    shareText,
    submitWord,
    useHint,
    skipPuzzle,
    nextPuzzle,
    setMode,
    copyShare,
    loadPuzzle,
  }
}
