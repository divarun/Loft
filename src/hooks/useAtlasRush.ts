'use client'

import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { Country, ClueKey, ClueState, GameMode, Difficulty, InputMode, BestScore } from '@/types/atlas'
import { buildAltNamesMap, normalizeGuess } from '@/lib/normalizeGuess'
import { haversineKm, distanceFeedback, bearingDeg } from '@/lib/haversine'
import { mulberry32 } from '@/lib/mulberry32'
import { getDayNumber } from '@/lib/dayNumber'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_SCORE = 1000
const CLUE_COST = 150
const WRONG_COST = 50
const CLUE_KEYS: ClueKey[] = ['continent', 'pop', 'borders', 'capital', 'shape', 'flag', 'hint']
const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
export interface AtlasRushState {
  countries: Country[]
  altNames: Map<string, string>
  current: Country | null
  queue: Country[]
  revealed: number
  score: number
  wrongGuesses: number
  streak: number
  roundOver: boolean
  clueStates: ClueState[]
  mode: GameMode
  difficulty: Difficulty
  inputMode: InputMode
  distanceFeedback: string | null
  suggestions: string[]
  feedback: string
  bestScores: BestScore[]
  worldFeatures: null  // always null in state; real features live in a ref
  shareText: string
  dailyDone: boolean
  dailyResult: 'won' | 'lost' | null
  dayNumber: number
}

// ---------------------------------------------------------------------------
// Action union
// ---------------------------------------------------------------------------
type Action =
  | { type: 'INIT'; countries: Country[]; streak: number; bestScores: BestScore[]; dayNumber: number }
  | { type: 'START_ROUND'; country: Country; queue: Country[] }
  | { type: 'REVEAL_CLUE' }
  | { type: 'WRONG_GUESS'; distanceFeedback: string | null; feedback: string }
  | { type: 'CORRECT_GUESS'; shareText: string }
  | { type: 'SKIP' }
  | { type: 'NEXT_ROUND'; country: Country; queue: Country[] }
  | { type: 'SET_MODE'; mode: GameMode }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_INPUT_MODE'; inputMode: InputMode }
  | { type: 'UPDATE_SUGGESTIONS'; suggestions: string[] }
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'SET_DAILY_DONE'; result: 'won' | 'lost' }
  | { type: 'SAVE_BEST_SCORE'; entry: BestScore }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildInitialClueStates(): ClueState[] {
  return CLUE_KEYS.map((_, i) => (i === 0 ? 'revealed' : 'locked')) as ClueState[]
}

function buildShareText(
  won: boolean,
  score: number,
  revealed: number,
  clueStates: ClueState[],
  streak: number,
  mode: GameMode,
  dayNumber: number
): string {
  const label = mode === 'daily' ? `AtlasRush #${dayNumber}` : 'AtlasRush Practice'
  const dots = clueStates.map((s) => {
    if (s === 'correct') return '🟩'
    if (s === 'lost') return '🟥'
    if (s === 'revealed') return '🟨'
    return '⬜'
  })
  const result = won ? `✅ ${score} pts` : '❌ Not found'
  const streakLine = streak > 1 ? `\n🔥 Streak: ${streak}` : ''
  return `${label}\n${dots.join('')}\n${result}\nClues used: ${revealed}${streakLine}\nhttps://loft-self.vercel.app/atlas-rush`
}

function pickCountry(pool: Country[], queue: Country[], rand: () => number): { country: Country; newQueue: Country[] } {
  if (queue.length === 0) {
    // Reshuffle
    const shuffled = [...pool].sort(() => rand() - 0.5)
    return { country: shuffled[0], newQueue: shuffled.slice(1) }
  }
  return { country: queue[0], newQueue: queue.slice(1) }
}

function filterPool(countries: Country[], difficulty: Difficulty): Country[] {
  if (difficulty === 'easy') return countries.filter((c) => c.difficulty === 'easy')
  if (difficulty === 'medium') return countries.filter((c) => c.difficulty === 'easy' || c.difficulty === 'medium')
  return countries
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function reducer(state: AtlasRushState, action: Action): AtlasRushState {
  switch (action.type) {
    case 'INIT': {
      const altNames = buildAltNamesMap(action.countries)
      return {
        ...state,
        countries: action.countries,
        altNames,
        streak: action.streak,
        bestScores: action.bestScores,
        dayNumber: action.dayNumber,
      }
    }

    case 'START_ROUND':
    case 'NEXT_ROUND': {
      return {
        ...state,
        current: action.country,
        queue: action.queue,
        revealed: 1,
        score: MAX_SCORE,
        wrongGuesses: 0,
        roundOver: false,
        clueStates: buildInitialClueStates(),
        distanceFeedback: null,
        suggestions: [],
        feedback: '',
        shareText: '',
      }
    }

    case 'REVEAL_CLUE': {
      if (state.roundOver || state.revealed >= CLUE_KEYS.length) return state
      const newRevealed = state.revealed + 1
      const newStates = state.clueStates.map((s, i) =>
        i < newRevealed ? (s === 'locked' ? 'revealed' : s) : s
      ) as ClueState[]
      return {
        ...state,
        revealed: newRevealed,
        score: Math.max(0, state.score - CLUE_COST),
        clueStates: newStates,
        feedback: '',
      }
    }

    case 'WRONG_GUESS': {
      return {
        ...state,
        wrongGuesses: state.wrongGuesses + 1,
        score: Math.max(0, state.score - WRONG_COST),
        distanceFeedback: action.distanceFeedback,
        feedback: action.feedback,
      }
    }

    case 'CORRECT_GUESS': {
      const winStates = state.clueStates.map((s) =>
        s === 'revealed' ? 'correct' : s === 'locked' ? 'locked' : s
      ) as ClueState[]
      return {
        ...state,
        roundOver: true,
        clueStates: winStates,
        distanceFeedback: null,
        feedback: '',
        shareText: action.shareText,
      }
    }

    case 'SKIP': {
      const lostStates = state.clueStates.map((s) =>
        s === 'revealed' ? 'lost' : s
      ) as ClueState[]
      const shareText = buildShareText(false, 0, state.revealed, lostStates, state.streak, state.mode, state.dayNumber)
      return {
        ...state,
        roundOver: true,
        score: 0,
        clueStates: lostStates,
        feedback: '',
        shareText,
      }
    }

    case 'SET_MODE': {
      return { ...state, mode: action.mode }
    }

    case 'SET_DIFFICULTY': {
      return { ...state, difficulty: action.difficulty }
    }

    case 'SET_INPUT_MODE': {
      return { ...state, inputMode: action.inputMode }
    }

    case 'UPDATE_SUGGESTIONS': {
      return { ...state, suggestions: action.suggestions }
    }

    case 'CLEAR_FEEDBACK': {
      return { ...state, feedback: '' }
    }

    case 'SET_DAILY_DONE': {
      return { ...state, dailyDone: true, dailyResult: action.result }
    }

    case 'SAVE_BEST_SCORE': {
      const updated = [action.entry, ...state.bestScores].slice(0, 20)
      return { ...state, bestScores: updated }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const initialState: AtlasRushState = {
  countries: [],
  altNames: new Map(),
  current: null,
  queue: [],
  revealed: 1,
  score: MAX_SCORE,
  wrongGuesses: 0,
  streak: 0,
  roundOver: false,
  clueStates: buildInitialClueStates(),
  mode: 'practice',
  difficulty: 'easy',
  inputMode: 'type',
  distanceFeedback: null,
  suggestions: [],
  feedback: '',
  bestScores: [],
  worldFeatures: null,
  shareText: '',
  dailyDone: false,
  dailyResult: null,
  dayNumber: 0,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAtlasRush() {
  const [state, dispatch] = useReducer(reducer, initialState)
  // topojson features live in a ref to avoid heavy re-renders
  const worldFeaturesRef = useRef<unknown[] | null>(null)
  const randRef = useRef<(() => number) | null>(null)
  const countriesRef = useRef<Country[]>([])
  const centroidsRef = useRef<Record<string, [number, number]>>({})

  // ------------- Boot: load countries + centroids + stored data -------------
  useEffect(() => {
    async function boot() {
      const [countriesModule, centroidsResp] = await Promise.all([
        import('@/data/countries.json') as Promise<{ default: Country[] }>,
        fetch('/data/centroids.json').then((r) => r.json()) as Promise<Record<string, [number, number]>>,
      ])

      const rawCountries = countriesModule.default as Country[]
      const centroids = centroidsResp
      centroidsRef.current = centroids

      // Inject lat/lon into country objects
      const countries: Country[] = rawCountries.map((c) => {
        const coords = centroids[c.code]
        return coords ? { ...c, lat: coords[0], lon: coords[1] } : c
      })

      countriesRef.current = countries

      const dayNumber = getDayNumber()
      const streak = parseInt(localStorage.getItem('atlasRush_streak') ?? '0', 10) || 0

      let bestScores: BestScore[] = []
      try {
        bestScores = JSON.parse(localStorage.getItem('atlasRush_scores') ?? '[]')
      } catch {
        bestScores = []
      }

      dispatch({ type: 'INIT', countries, streak, bestScores, dayNumber })

      // Load world atlas for shape clue
      fetch(WORLD_ATLAS_URL)
        .then((r) => r.json())
        .then(async (topo) => {
          const { feature } = await import('topojson-client')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const features = (feature(topo, (topo as any).objects.countries) as any).features
          worldFeaturesRef.current = features
        })
        .catch(() => {
          // Shape clue degrades gracefully if atlas fails
        })
    }
    boot()
  }, [])

  // ------------- Start practice round once countries are loaded -------------
  useEffect(() => {
    if (state.countries.length === 0 || state.mode !== 'practice') return
    if (state.current !== null) return
    startPracticeRound()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.countries, state.mode])

  // ------------- Daily mode: fetch country and check if already done --------
  useEffect(() => {
    if (state.mode !== 'daily' || state.countries.length === 0) return

    async function loadDaily() {
      const res = await fetch('/api/daily-country')
      const { dayNumber, countryCode } = await res.json()

      const doneKey = `atlasRush_daily_${dayNumber}`
      const done = localStorage.getItem(doneKey) as 'won' | 'lost' | null

      if (done) {
        dispatch({ type: 'SET_DAILY_DONE', result: done })
        return
      }

      const country = state.countries.find((c) => c.code === countryCode)
      if (!country) return

      dispatch({ type: 'START_ROUND', country, queue: state.queue })
    }

    loadDaily()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, state.countries])

  // ------------- Helpers ----------------------------------------------------
  function getRand(): () => number {
    if (!randRef.current) {
      randRef.current = mulberry32(Date.now())
    }
    return randRef.current
  }

  function startPracticeRound() {
    const pool = filterPool(countriesRef.current, state.difficulty)
    if (pool.length === 0) return
    const rand = getRand()
    const { country, newQueue } = pickCountry(pool, state.queue, rand)
    dispatch({ type: 'START_ROUND', country, queue: newQueue })
  }

  function saveBestScore(won: boolean) {
    if (!state.current) return
    const entry: BestScore = {
      country: state.current.name,
      flag: state.current.flag,
      score: state.score,
      clues: state.revealed,
      difficulty: state.mode === 'daily' ? 'daily' : state.difficulty,
      won,
      date: new Date().toLocaleDateString(),
    }
    dispatch({ type: 'SAVE_BEST_SCORE', entry })
    try {
      const current: BestScore[] = JSON.parse(localStorage.getItem('atlasRush_scores') ?? '[]')
      localStorage.setItem('atlasRush_scores', JSON.stringify([entry, ...current].slice(0, 20)))
    } catch {
      // ignore
    }
  }

  function updateStreak(won: boolean) {
    let streak = parseInt(localStorage.getItem('atlasRush_streak') ?? '0', 10) || 0
    if (won) {
      streak += 1
    } else {
      streak = 0
    }
    localStorage.setItem('atlasRush_streak', String(streak))
    return streak
  }

  // ------------- Exposed actions -------------------------------------------
  const revealNextClue = useCallback(() => {
    if (state.roundOver || state.revealed >= CLUE_KEYS.length) return
    dispatch({ type: 'REVEAL_CLUE' })
  }, [state.roundOver, state.revealed])

  const submitGuess = useCallback(
    (raw: string) => {
      if (!state.current || state.roundOver || !raw.trim()) return

      const normalized = normalizeGuess(raw, state.altNames)
      const correct = state.current.name.toLowerCase()

      if (normalized === correct) {
        // Win
        const newStreak = updateStreak(true)
        const winStates = state.clueStates.map((s) =>
          s === 'revealed' ? 'correct' : s
        ) as ClueState[]
        const shareText = buildShareText(true, state.score, state.revealed, winStates, newStreak, state.mode, state.dayNumber)
        dispatch({ type: 'CORRECT_GUESS', shareText })
        saveBestScore(true)

        if (state.mode === 'daily') {
          const doneKey = `atlasRush_daily_${state.dayNumber}`
          localStorage.setItem(doneKey, 'won')
        }
      } else {
        // Wrong
        let fb: string | null = null
        if (state.countries.length > 0) {
          const guessed = state.countries.find(
            (c) => c.name.toLowerCase() === normalized || (c.alts ?? []).some((a) => a.toLowerCase() === normalized)
          )
          if (guessed && guessed.lat != null && guessed.lon != null && state.current.lat != null && state.current.lon != null) {
            const km = haversineKm(guessed.lat, guessed.lon, state.current.lat, state.current.lon)
            const bearing = bearingDeg(guessed.lat, guessed.lon, state.current.lat, state.current.lon)
            fb = distanceFeedback(km, bearing)
          }
        }

        let feedbackMsg = `Not quite! Try again.`
        if (normalized.length > 1) {
          feedbackMsg = `"${raw.trim()}" is not the answer.`
        }

        dispatch({ type: 'WRONG_GUESS', distanceFeedback: fb, feedback: feedbackMsg })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.current, state.roundOver, state.altNames, state.clueStates, state.score, state.revealed, state.mode, state.dayNumber, state.countries]
  )

  const skipCountry = useCallback(() => {
    if (state.roundOver || !state.current) return
    updateStreak(false)
    saveBestScore(false)

    if (state.mode === 'daily') {
      const doneKey = `atlasRush_daily_${state.dayNumber}`
      localStorage.setItem(doneKey, 'lost')
    }

    dispatch({ type: 'SKIP' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundOver, state.current, state.mode, state.dayNumber, state.revealed])

  const nextRound = useCallback(() => {
    if (state.mode === 'daily') return // no next in daily

    const pool = filterPool(countriesRef.current, state.difficulty)
    if (pool.length === 0) return
    const rand = getRand()
    const { country, newQueue } = pickCountry(pool, state.queue, rand)
    dispatch({ type: 'NEXT_ROUND', country, queue: newQueue })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, state.difficulty, state.queue])

  const setMode = useCallback((mode: GameMode) => {
    dispatch({ type: 'SET_MODE', mode })
  }, [])

  const setDifficulty = useCallback((diff: Difficulty) => {
    dispatch({ type: 'SET_DIFFICULTY', difficulty: diff })
    // Reset pool seeding
    randRef.current = null
  }, [])

  const setInputMode = useCallback((mode: InputMode) => {
    dispatch({ type: 'SET_INPUT_MODE', inputMode: mode })
  }, [])

  const updateSuggestions = useCallback(
    (val: string) => {
      if (!val.trim() || val.length < 1) {
        dispatch({ type: 'UPDATE_SUGGESTIONS', suggestions: [] })
        return
      }
      const q = val.toLowerCase()
      const results = state.countries
        .filter((c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q))
        .map((c) => c.name)
        .slice(0, 8)
      dispatch({ type: 'UPDATE_SUGGESTIONS', suggestions: results })
    },
    [state.countries]
  )

  const copyShare = useCallback(() => {
    if (!state.shareText) return
    navigator.clipboard.writeText(state.shareText).catch(() => {
      // fallback: select + copy
    })
  }, [state.shareText])

  return {
    state,
    worldFeaturesRef,
    revealNextClue,
    submitGuess,
    skipCountry,
    nextRound,
    setMode,
    setDifficulty,
    setInputMode,
    updateSuggestions,
    copyShare,
    CLUE_KEYS,
    MAX_SCORE,
    CLUE_COST,
    WRONG_COST,
  }
}
