'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { Category, PowerUp, PowerUpType, Tile, WordBank, WordEntry } from '@/types/letterdrop'

// ── WEB AUDIO ──────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch (_) {}
  }
  return audioCtx
}

function playTone(soundOn: boolean, freq: number, type: OscillatorType, gainVal: number, duration: number) {
  if (!soundOn) return
  const ctx = getAudioCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(gainVal, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (_) {}
}

// ── STATE ──────────────────────────────────────────────────────────────────
interface GameState {
  score: number
  wordsCorrect: number
  level: number
  lives: number
  combo: number
  maxCombo: number
  longestWord: string
  clutchSaves: number
  running: boolean
  paused: boolean
  category: Category
  powerUps: PowerUp[]
  lastDefWord: string
  lastDef: string
}

type GameAction =
  | { type: 'START' }
  | { type: 'END' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SET_SCORE'; score: number }
  | { type: 'LOSE_LIFE' }
  | { type: 'CORRECT'; points: number; word: string; def: string; isClutch: boolean; newCombo: number; newLevel: number | null }
  | { type: 'WRONG' }
  | { type: 'SET_CATEGORY'; category: Category }
  | { type: 'SET_POWERUP_AVAILABLE'; powerType: PowerUpType; available: boolean }
  | { type: 'SET_POWERUP_COOLDOWN'; powerType: PowerUpType; until: number }
  | { type: 'RESET_COMBO' }

const initialPowerUps: PowerUp[] = [
  { type: 'slow',   available: false, cooldownUntil: 0 },
  { type: 'freeze', available: false, cooldownUntil: 0 },
  { type: 'reveal', available: false, cooldownUntil: 0 },
]

const initialState: GameState = {
  score: 0,
  wordsCorrect: 0,
  level: 1,
  lives: 3,
  combo: 1,
  maxCombo: 1,
  longestWord: '',
  clutchSaves: 0,
  running: false,
  paused: false,
  category: 'all',
  powerUps: initialPowerUps,
  lastDefWord: '',
  lastDef: 'Solve a word to see its definition here.',
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return {
        ...initialState,
        category: state.category,
        running: true,
        paused: false,
        powerUps: initialPowerUps.map(p => ({ ...p, available: false, cooldownUntil: 0 })),
        lastDef: 'Solve a word to see its definition here.',
      }
    case 'END':
      return { ...state, running: false, paused: false }
    case 'PAUSE':
      return { ...state, paused: true }
    case 'RESUME':
      return { ...state, paused: false }
    case 'LOSE_LIFE':
      return { ...state, lives: state.lives - 1, combo: 1 }
    case 'CORRECT': {
      const newCombo    = action.newCombo
      const newMaxCombo = Math.max(state.maxCombo, newCombo)
      const newLongest  = action.word.length > state.longestWord.length ? action.word : state.longestWord
      const newClutch   = state.clutchSaves + (action.isClutch ? 1 : 0)
      const newWords    = state.wordsCorrect + 1

      // Award power-up charges every 7 words
      let powerUps = state.powerUps
      if (newWords % 7 === 0) {
        powerUps = powerUps.map(p => ({ ...p, available: true }))
      }

      return {
        ...state,
        score:        state.score + action.points,
        wordsCorrect: newWords,
        level:        action.newLevel ?? state.level,
        combo:        newCombo,
        maxCombo:     newMaxCombo,
        longestWord:  newLongest,
        clutchSaves:  newClutch,
        lastDefWord:  action.word,
        lastDef:      action.def,
        powerUps,
      }
    }
    case 'WRONG':
      return { ...state, combo: 1 }
    case 'SET_CATEGORY':
      return { ...state, category: action.category }
    case 'SET_POWERUP_AVAILABLE': {
      const powerUps = state.powerUps.map(p =>
        p.type === action.powerType ? { ...p, available: action.available } : p
      )
      return { ...state, powerUps }
    }
    case 'SET_POWERUP_COOLDOWN': {
      const powerUps = state.powerUps.map(p =>
        p.type === action.powerType ? { ...p, available: false, cooldownUntil: action.until } : p
      )
      return { ...state, powerUps }
    }
    case 'RESET_COMBO':
      return { ...state, combo: 1 }
    default:
      return state
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function getTier(level: number) {
  if (level <= 2) return 'easy'
  if (level <= 4) return 'medium'
  if (level <= 6) return 'hard'
  return 'expert'
}

function spawnDelay(level: number) {
  return Math.max(1400, 3000 - (level - 1) * 220)
}

function fallDuration(level: number) {
  return Math.max(3500, 8500 - (level - 1) * 550)
}

function updateTileColorClass(el: HTMLDivElement, progress: number) {
  el.classList.remove('tile-safe', 'tile-warn', 'tile-hot', 'tile-critical')
  if      (progress < 0.5)  el.classList.add('tile-safe')
  else if (progress < 0.75) el.classList.add('tile-warn')
  else if (progress < 0.90) el.classList.add('tile-hot')
  else                       el.classList.add('tile-critical')
}

// ── HOOK ───────────────────────────────────────────────────────────────────
export function useLetterDrop() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Mutable refs — NOT state
  const tilesRef            = useRef<Tile[]>([])
  const usedWordsRef        = useRef<Set<string>>(new Set())
  const rafRef              = useRef<number | null>(null)
  const spawnIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCorrectTimeRef  = useRef<number>(0)
  const slowUntilRef        = useRef<number>(0)
  const freezeUntilRef      = useRef<number>(0)
  const freezeStartRef      = useRef<number>(0) // when freeze began

  // Stable refs to avoid stale closures
  const stateRef    = useRef(state)
  const wordBankRef = useRef<WordBank | null>(null)
  const categoryDataRef = useRef<Record<string, string[]> | null>(null)
  const soundOnRef  = useRef<boolean>(true)
  const arenaRef    = useRef<HTMLDivElement | null>(null)
  const groundRef   = useRef<HTMLDivElement | null>(null)
  const inputRef    = useRef<HTMLInputElement | null>(null)

  // Keep stateRef in sync
  stateRef.current = state

  // Load sound pref
  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ld_sound') : null
    soundOnRef.current = saved !== '0'
  }, [])

  // Preload word bank and category data
  useEffect(() => {
    async function load() {
      try {
        const wbMod = await import('@/data/words.json')
        wordBankRef.current = wbMod.default as WordBank
      } catch (e) {
        console.error('Failed to load word bank', e)
      }
      try {
        const res = await fetch('/data/categories.json')
        categoryDataRef.current = await res.json()
      } catch (e) {
        console.error('Failed to load categories', e)
      }
    }
    load()
  }, [])

  // ── Word selection ──────────────────────────────────────────────────────
  const getWord = useCallback((category: Category, level: number): WordEntry | null => {
    const bank = wordBankRef.current
    if (!bank) return null
    const tier = getTier(level)
    let pool: WordEntry[] = bank[tier] || bank.easy

    // Category filter
    if (category !== 'all' && categoryDataRef.current) {
      const catSet = new Set((categoryDataRef.current[category] || []).map(s => s.toUpperCase()))
      const filtered = pool.filter(w => catSet.has(w[1].toUpperCase()))
      if (filtered.length > 0) pool = filtered
    }

    let available = pool.filter(w => !usedWordsRef.current.has(w[1]))
    if (available.length === 0) {
      pool.forEach(w => usedWordsRef.current.delete(w[1]))
      available = pool
    }
    return available[Math.floor(Math.random() * available.length)]
  }, [])

  // ── Spawn tile ──────────────────────────────────────────────────────────
  const spawnTile = useCallback(() => {
    const s = stateRef.current
    if (!s.running || s.paused) return
    const arena = arenaRef.current
    if (!arena) return

    const entry = getWord(s.category, s.level)
    if (!entry) return
    const [scrambled, answer, hint, def] = entry
    usedWordsRef.current.add(answer)

    const isMobile  = window.innerWidth <= 480
    const tileW     = isMobile ? 88 : 108
    const arenaW    = arena.offsetWidth
    const maxX      = Math.max(0, arenaW - tileW - 10)
    const minGap    = tileW + 8
    const active    = tilesRef.current.filter(t => !t.removed).map(t => t.x)
    let x = 10 + Math.floor(Math.random() * Math.max(1, maxX))
    for (let i = 0; i < 10; i++) {
      const cx = 10 + Math.floor(Math.random() * Math.max(1, maxX))
      if (!active.some(ex => Math.abs(ex - cx) < minGap)) { x = cx; break }
    }

    const dur       = fallDuration(s.level)
    const startTime = performance.now()
    const id        = `tile-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const el = document.createElement('div')
    el.className = 'tile tile-safe tile--spawning'
    el.style.cssText = `left:${x}px;top:0;width:${tileW}px;`
    el.style.transform = 'translateY(-90px)'

    const lettersHtml = scrambled.split('').map(ch =>
      `<div class="tile-letter">${ch}</div>`
    ).join('')
    el.innerHTML = `<div class="tile-letters">${lettersHtml}</div><div class="tile-hint">${hint}</div>`
    arena.appendChild(el)

    // Remove spawn animation class after it plays
    setTimeout(() => el.classList.remove('tile--spawning'), 400)

    const tileObj: Tile = { id, el, answer, def, dur, startTime, removed: false, landed: false, x }
    tilesRef.current.push(tileObj)
  }, [getWord])

  // ── Lose life ───────────────────────────────────────────────────────────
  const loseLifeRef = useRef<((tile: Tile) => void) | null>(null)

  const endGameRef = useRef<(() => void) | null>(null)

  loseLifeRef.current = (tileObj: Tile) => {
    if (tileObj.removed) return
    // remove tile from DOM
    tileObj.removed = true
    tileObj.el.remove()
    tilesRef.current = tilesRef.current.filter(t => t !== tileObj)

    dispatch({ type: 'LOSE_LIFE' })

    // sfxMiss
    playTone(soundOnRef.current, 160, 'sawtooth', 0.14, 0.25)

    // Show first letter on ground briefly
    const ground = groundRef.current
    if (ground) {
      const gl = document.createElement('div')
      gl.className = 'ground-letter'
      gl.textContent = tileObj.answer[0]
      ground.appendChild(gl)
      setTimeout(() => gl.remove(), 1500)
    }

    // Check lives after this dispatch — we use stateRef.current.lives - 1 (optimistic)
    if (stateRef.current.lives - 1 <= 0) {
      setTimeout(() => endGameRef.current?.(), 300)
    }
  }

  endGameRef.current = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current)
    rafRef.current = null
    spawnIntervalRef.current = null

    tilesRef.current.forEach(t => { if (!t.removed) t.el.remove() })
    tilesRef.current = []

    dispatch({ type: 'END' })

    // Save to localStorage
    const s = stateRef.current
    try {
      const saved = JSON.parse(localStorage.getItem('ld_scores') || '[]') as object[]
      saved.unshift({
        score:       s.score,
        words:       s.wordsCorrect,
        level:       s.level,
        maxCombo:    s.maxCombo,
        clutch:      s.clutchSaves,
        longestWord: s.longestWord,
        date:        new Date().toLocaleDateString(),
      })
      localStorage.setItem('ld_scores', JSON.stringify(saved.slice(0, 10)))
    } catch (_) {}
  }

  // ── Game loop ───────────────────────────────────────────────────────────
  const gameLoop = useCallback((now: number) => {
    const s = stateRef.current
    if (!s.running) return

    if (!s.paused) {
      const arena = arenaRef.current
      if (!arena) { rafRef.current = requestAnimationFrame(gameLoop); return }

      const arenaH    = arena.offsetHeight
      const groundTop = arenaH - 52
      const dangerY   = groundTop - 60 - 56

      const isFrozen  = now < freezeUntilRef.current
      const isSlowed  = now < slowUntilRef.current

      tilesRef.current.forEach(t => {
        if (t.removed) return

        let effectiveDur = t.dur
        if (isSlowed) effectiveDur = t.dur * 2

        const progress  = Math.min((now - t.startTime) / effectiveDur, 1)
        const y         = -90 + progress * (groundTop + 90)

        if (!isFrozen) {
          t.el.style.transform = `translateY(${y}px)`
        }

        updateTileColorClass(t.el, progress)

        const isUrgent = y > dangerY
        t.el.classList.toggle('urgent', isUrgent)

        if (progress >= 1 && !t.landed && !isFrozen) {
          t.landed = true
          loseLifeRef.current?.(t)
        }
      })
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [])

  // ── Start game ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    // Resume audio context on first user gesture
    const ctx = getAudioCtx()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})

    // Clear existing
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current)

    tilesRef.current.forEach(t => { if (!t.removed) t.el.remove() })
    tilesRef.current = []
    usedWordsRef.current = new Set()
    lastCorrectTimeRef.current = 0
    slowUntilRef.current = 0
    freezeUntilRef.current = 0
    freezeStartRef.current = 0

    if (arenaRef.current) arenaRef.current.innerHTML = ''
    if (groundRef.current) groundRef.current.innerHTML = ''

    dispatch({ type: 'START' })

    // Spawn first tile + interval
    setTimeout(() => {
      spawnTile()
      spawnIntervalRef.current = setInterval(spawnTile, spawnDelay(1))
      rafRef.current = requestAnimationFrame(gameLoop)
      inputRef.current?.focus()
    }, 50)
  }, [spawnTile, gameLoop])

  // ── Submit answer ── returns 'correct' | 'wrong' | 'idle' ─────────────
  const submitAnswer = useCallback((raw: string): 'correct' | 'wrong' | 'idle' => {
    const s = stateRef.current
    if (!s.running || s.paused) return 'idle'
    const guess = raw.trim().toUpperCase()
    if (!guess) return 'idle'

    const matched = tilesRef.current.find(t => !t.removed && t.answer.toUpperCase() === guess)

    if (matched) {
      const now = performance.now()
      const timeSinceLast = now - lastCorrectTimeRef.current
      lastCorrectTimeRef.current = now

      const newCombo = (timeSinceLast < 5000 && s.wordsCorrect > 0)
        ? Math.min(s.combo + 1, 4)
        : 1

      // Detect clutch
      const arena = arenaRef.current
      const arenaH    = arena?.offsetHeight ?? 340
      const groundTop = arenaH - 52
      const dangerY   = groundTop - 60 - 56
      const effectiveDur = now < slowUntilRef.current ? matched.dur * 2 : matched.dur
      const progress  = Math.min((now - matched.startTime) / effectiveDur, 1)
      const tileY     = -90 + progress * (groundTop + 90)
      const isClutch  = tileY > dangerY

      const basePoints  = matched.answer.length * 10 * newCombo * s.level
      const clutchBonus = isClutch ? Math.floor(basePoints * 0.5) : 0
      const points      = basePoints + clutchBonus

      const newWordsCorrect = s.wordsCorrect + 1
      let newLevel: number | null = null
      if (newWordsCorrect % 5 === 0) {
        newLevel = s.level + 1
        if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current)
        const nextLevel = s.level + 1
        spawnIntervalRef.current = setInterval(spawnTile, spawnDelay(nextLevel))
        // sfxLevelUp
        playTone(soundOnRef.current, 660, 'sine', 0.15, 0.1)
        setTimeout(() => playTone(soundOnRef.current, 880, 'sine', 0.15, 0.1), 100)
        setTimeout(() => playTone(soundOnRef.current, 1100, 'sine', 0.12, 0.2), 200)
      }

      dispatch({
        type: 'CORRECT',
        points,
        word:     matched.answer,
        def:      matched.def,
        isClutch,
        newCombo,
        newLevel,
      })

      if (isClutch) {
        playTone(soundOnRef.current, 1100, 'sine', 0.22, 0.22)
        setTimeout(() => playTone(soundOnRef.current, 1320, 'sine', 0.15, 0.15), 80)
        matched.el.classList.add('clutch-flash')
      } else {
        playTone(soundOnRef.current, 880, 'sine', 0.18, 0.15)
      }

      // Flash then remove
      matched.el.style.background = isClutch
        ? 'rgba(196,164,110,0.18)'
        : 'rgba(120,196,160,0.12)'
      matched.el.style.borderColor = isClutch
        ? 'rgba(196,164,110,0.5)'
        : 'rgba(120,196,160,0.4)'
      setTimeout(() => {
        if (!matched.removed) {
          matched.removed = true
          matched.el.remove()
          tilesRef.current = tilesRef.current.filter(t => t !== matched)
        }
      }, 260)

      return 'correct'
    } else {
      dispatch({ type: 'WRONG' })
      playTone(soundOnRef.current, 220, 'square', 0.12, 0.18)
      return 'wrong'
    }
  }, [spawnTile])

  // ── Toggle pause ────────────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    const s = stateRef.current
    if (!s.running) return
    if (s.paused) {
      dispatch({ type: 'RESUME' })
      rafRef.current = requestAnimationFrame(gameLoop)
    } else {
      dispatch({ type: 'PAUSE' })
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [gameLoop])

  // ── Toggle sound ────────────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    soundOnRef.current = !soundOnRef.current
    try { localStorage.setItem('ld_sound', soundOnRef.current ? '1' : '0') } catch (_) {}
    return soundOnRef.current
  }, [])

  // ── Power-ups ───────────────────────────────────────────────────────────
  const applyPowerUp = useCallback((type: PowerUpType) => {
    const s = stateRef.current
    const pu = s.powerUps.find(p => p.type === type)
    if (!pu?.available) return

    const now = performance.now()
    dispatch({ type: 'SET_POWERUP_COOLDOWN', powerType: type, until: now + 8000 })

    if (type === 'slow') {
      slowUntilRef.current = now + 5000
    } else if (type === 'freeze') {
      freezeUntilRef.current = now + 3000
      freezeStartRef.current = now
      // After 3s, adjust all tile startTimes to account for frozen period
      setTimeout(() => {
        const frozenDur = 3000
        tilesRef.current.forEach(t => {
          if (!t.removed) t.startTime += frozenDur
        })
        freezeUntilRef.current = 0
      }, 3000)
    } else if (type === 'reveal') {
      // Find tile closest to ground
      const arena = arenaRef.current
      if (!arena) return
      const arenaH = arena.offsetHeight
      const groundTop = arenaH - 52
      let closest: Tile | null = null
      let maxProgress = -1
      tilesRef.current.forEach(t => {
        if (t.removed) return
        const progress = Math.min((now - t.startTime) / t.dur, 1)
        if (progress > maxProgress) { maxProgress = progress; closest = t }
      })
      if (closest) {
        const tile = closest as Tile
        // Show answer
        const lettersDiv = tile.el.querySelector('.tile-letters') as HTMLDivElement | null
        if (lettersDiv) {
          lettersDiv.innerHTML = tile.answer.split('').map(ch =>
            `<div class="tile-letter" style="color:var(--accent)">${ch}</div>`
          ).join('')
          // Re-scramble after 2s
          setTimeout(() => {
            if (!tile.removed) {
              const scrambled = tile.answer.split('').sort(() => Math.random() - 0.5).join('')
              lettersDiv.innerHTML = scrambled.split('').map(ch =>
                `<div class="tile-letter">${ch}</div>`
              ).join('')
            }
          }, 2000)
        }
      }
    }
  }, [])

  // ── Category ────────────────────────────────────────────────────────────
  const setCategory = useCallback((cat: Category) => {
    if (!stateRef.current.running) {
      dispatch({ type: 'SET_CATEGORY', category: cat })
    }
  }, [])

  // ── Share text ──────────────────────────────────────────────────────────
  const copyShare = useCallback(() => {
    const s = stateRef.current
    const stars = s.score >= 500 ? '⭐⭐⭐' : s.score >= 200 ? '⭐⭐' : '⭐'
    const clutchTag = s.clutchSaves > 0 ? ` · 🔥 ${s.clutchSaves} clutch save${s.clutchSaves > 1 ? 's' : ''}` : ''
    const longestTag = s.longestWord ? ` · Best: ${s.longestWord}` : ''
    const comboTag = s.maxCombo > 1 ? ` · Max combo ×${s.maxCombo}` : ''
    const text = [
      'LetterDrop 🔤',
      stars,
      `Score: ${s.score} | Words: ${s.wordsCorrect} | Level: ${s.level}`,
      `${clutchTag}${longestTag}${comboTag}`.trim() || null,
    ].filter(Boolean).join('\n')

    navigator.clipboard?.writeText(text).catch(() => {
      const ta = Object.assign(document.createElement('textarea'), {
        value: text,
        style: 'position:fixed;opacity:0;top:0;left:0',
      })
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      try { document.execCommand('copy') } catch (_) {}
      document.body.removeChild(ta)
    })
    return text
  }, [])

  // ── Leaderboard submit ──────────────────────────────────────────────────
  const submitToLeaderboard = useCallback(async (name: string): Promise<number | null> => {
    const s = stateRef.current
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'letter-drop', name, score: s.score }),
      })
      const data = await res.json() as { rank?: number }
      return data.rank ?? null
    } catch (_) {
      return null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current)
    }
  }, [])

  return {
    state,
    arenaRef,
    groundRef,
    inputRef,
    soundOnRef,
    startGame,
    submitAnswer,
    togglePause,
    toggleSound,
    applyPowerUp,
    setCategory,
    copyShare,
    submitToLeaderboard,
  }
}
