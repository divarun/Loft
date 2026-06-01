'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { DontStepDifficulty, MemoryEntry, DontStepUIState } from '@/types/dontstep'
import { mulberry32 } from '@/lib/mulberry32'
import { getDayNumber } from '@/lib/dayNumber'

// ── Constants ──────────────────────────────────────────────────────────────
const TILE_PX = 50
const MAX_GRID = 20

const DIFFICULTIES: Record<DontStepDifficulty, { trapRate: number; label: string; offset: number }> = {
  easy:   { trapRate: 0.12, label: 'Easy',   offset: 1 },
  medium: { trapRate: 0.18, label: 'Medium',  offset: 2 },
  hard:   { trapRate: 0.28, label: 'Hard',    offset: 3 },
}

// ── Helpers ────────────────────────────────────────────────────────────────
function tkey(x: number, y: number): string { return `${x},${y}` }

function getDaySeed(): number {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

function memKey(diff: DontStepDifficulty): string {
  return `dsoi_mem_${getDaySeed()}_${diff}`
}

function feetKey(diff: DontStepDifficulty): string {
  return `dsoi_feet_${getDaySeed()}_${diff}`
}

function loadMemory(diff: DontStepDifficulty): MemoryEntry[] {
  try { return JSON.parse(localStorage.getItem(memKey(diff)) || '[]') }
  catch { return [] }
}

function saveMemory(mem: MemoryEntry[], diff: DontStepDifficulty) {
  try { localStorage.setItem(memKey(diff), JSON.stringify(mem.slice(-60))) }
  catch {}
}

function loadFootprints(diff: DontStepDifficulty): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(feetKey(diff)) || '[]')
    return new Set<string>(raw)
  } catch { return new Set() }
}

function saveFootprints(feet: Set<string>, diff: DontStepDifficulty) {
  try { localStorage.setItem(feetKey(diff), JSON.stringify([...feet])) }
  catch {}
}

function loadBest(): number {
  return parseInt(localStorage.getItem('dsoi_best') || '0', 10)
}

function saveBest(score: number) {
  try { localStorage.setItem('dsoi_best', String(score)) }
  catch {}
}

// ── Mutable game state ─────────────────────────────────────────────────────
interface GameState {
  running: boolean
  player: { x: number; y: number }
  traps: Set<string>
  revealed: Set<string>
  footprints: Set<string>
  memory: MemoryEntry[]
  score: number
  lives: number
  deathPos: { x: number; y: number } | null
  deathAnim: number
  lastTs: number | null
  rafId: number | null
  gridSize: number
  previewPhase: boolean
  previewTimer: ReturnType<typeof setTimeout> | null
  previewOpacity: number   // 1 → 0 fade-out
  previewFading: boolean
  stepCount: number        // for throttling footprint saves
  canvasRef: HTMLCanvasElement | null
  // Red vignette for life-lost flash
  vignetteAnim: number
  vignetteActive: boolean
}

// ── Audio ──────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  return audioCtx
}

function playTone(freq: number, type: OscillatorType, dur: number, vol = 0.25, soundOn: boolean) {
  if (!soundOn) return
  try {
    const ac   = getAudioCtx()
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur)
    osc.start()
    osc.stop(ac.currentTime + dur)
  } catch (_) {}
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useDontStep() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gsRef     = useRef<GameState | null>(null)
  const diffRef   = useRef<DontStepDifficulty>('medium')
  const soundRef  = useRef<boolean>(true)
  const bestRef   = useRef<number>(loadBest())

  const [uiState, setUI] = useState<DontStepUIState>({
    running: false,
    score: 0,
    lives: 3,
    trapCount: 0,
    previewPhase: false,
    gridSize: 10,
    best: bestRef.current,
    memorySize: 0,
  })

  // Load sound preference once
  useEffect(() => {
    soundRef.current = localStorage.getItem('dsoi_sound') !== 'off'
  }, [])

  // ── updateUI ─────────────────────────────────────────────────────────────
  const updateUI = useCallback(() => {
    const gs = gsRef.current
    if (!gs) return
    setUI({
      running:     gs.running,
      score:       gs.score,
      lives:       gs.lives,
      trapCount:   gs.memory.length,
      previewPhase: gs.previewPhase,
      gridSize:    gs.gridSize,
      best:        bestRef.current,
      memorySize:  gs.memory.length,
    })
  }, [])

  // ── generateTraps ─────────────────────────────────────────────────────────
  const generateTraps = useCallback((
    size: number,
    existingTraps?: Set<string>,
  ): Set<string> => {
    const diff       = diffRef.current
    const { trapRate, offset } = DIFFICULTIES[diff]
    const daySeed    = getDaySeed()
    const seed       = daySeed * 100 + offset * 10 + size
    const rand       = mulberry32(seed)

    const result = new Set<string>(existingTraps)

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (x === 0 && y === 0) continue
        const k = tkey(x, y)
        // Always advance the PRNG to keep sequences deterministic
        const roll = rand()
        // Skip cells that already exist in the old grid
        if (existingTraps && existingTraps.has(k)) continue
        // Skip inner cells that aren't newly added when growing
        const isNewCell = !existingTraps || x >= (size - 2) || y >= (size - 2)
        if (!isNewCell) continue
        if (roll < trapRate) result.add(k)
      }
    }
    return result
  }, [])

  // ── draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const gs  = gsRef.current
    const canvas = canvasRef.current
    if (!gs || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { gridSize } = gs
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Red vignette overlay for life-lost flash
    const vignetteAlpha = gs.vignetteActive ? gs.vignetteAnim * 0.35 : 0

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const px   = x * TILE_PX
        const py   = y * TILE_PX
        const k    = tkey(x, y)
        const rev  = gs.revealed.has(k)
        const trap = gs.traps.has(k)
        const dead = gs.deathPos && gs.deathPos.x === x && gs.deathPos.y === y
        const isPlayer = gs.player.x === x && gs.player.y === y
        const mc   = gs.memory.filter(m => tkey(m.x, m.y) === k).length

        // Base color
        if (dead) {
          const flash = Math.abs(Math.sin(gs.deathAnim * Math.PI * 6))
          ctx.fillStyle = `rgb(${Math.floor(140 + flash * 115)},16,16)`
        } else if (rev && trap) {
          ctx.fillStyle = '#6b1111'
        } else if (rev) {
          ctx.fillStyle = '#141a14'
        } else {
          ctx.fillStyle = '#0e0e12'
        }
        ctx.fillRect(px, py, TILE_PX, TILE_PX)

        // Preview phase: faint green on safe tiles (with opacity fade)
        if ((gs.previewPhase || gs.previewFading) && !trap && !(x === 0 && y === 0)) {
          const alpha = gs.previewOpacity * 0.10
          ctx.fillStyle = `rgba(74,222,128,${alpha})`
          ctx.fillRect(px, py, TILE_PX, TILE_PX)
        }

        // Memory ghost: red hints for past trap positions
        if (!rev && mc > 0) {
          const alpha = Math.min(0.07 + mc * 0.07, 0.38)
          ctx.fillStyle = `rgba(220,40,40,${alpha})`
          ctx.fillRect(px, py, TILE_PX, TILE_PX)
          ctx.fillStyle = `rgba(240,80,80,${Math.min(alpha * 2.2, 0.65)})`
          ctx.beginPath()
          ctx.arc(px + TILE_PX / 2, py + TILE_PX / 2, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Footprint trail: persistent green dots
        if (gs.footprints.has(k) && !trap) {
          ctx.fillStyle = 'rgba(74,222,128,0.18)'
          ctx.beginPath()
          ctx.arc(px + TILE_PX / 2, py + TILE_PX / 2, 4, 0, Math.PI * 2)
          ctx.fill()
        }

        // Safe revealed dot (lighter than footprint, only when not player)
        if (rev && !trap && !isPlayer) {
          ctx.fillStyle = 'rgba(74,222,128,0.08)'
          ctx.beginPath()
          ctx.arc(px + TILE_PX / 2, py + TILE_PX / 2, 3, 0, Math.PI * 2)
          ctx.fill()
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_PX - 1, TILE_PX - 1)
      }
    }

    // Red vignette for life-lost
    if (vignetteAlpha > 0) {
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8,
      )
      grad.addColorStop(0, `rgba(248,113,113,0)`)
      grad.addColorStop(1, `rgba(248,113,113,${vignetteAlpha})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Player square
    if (!gs.deathPos || gs.deathAnim < 0.2) {
      const px  = gs.player.x * TILE_PX
      const py  = gs.player.y * TILE_PX
      const pad = 10
      ctx.shadowColor = '#4ade80'
      ctx.shadowBlur  = 14
      ctx.fillStyle   = '#4ade80'
      ctx.fillRect(px + pad, py + pad, TILE_PX - pad * 2, TILE_PX - pad * 2)
      ctx.shadowBlur  = 0
    }
  }, [])

  // ── RAF loop ──────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const gs = gsRef.current
    if (!gs) return

    if (gs.lastTs === null) gs.lastTs = ts
    const dt = Math.min((ts - gs.lastTs) / 1000, 0.1)
    gs.lastTs = ts

    // Death / trap flash animation
    if (gs.deathPos) {
      gs.deathAnim = Math.min(gs.deathAnim + dt * 4, 1)
    }

    // Preview fade-out
    if (gs.previewFading) {
      gs.previewOpacity = Math.max(0, gs.previewOpacity - dt * 5) // 200ms fade
      if (gs.previewOpacity === 0) gs.previewFading = false
    }

    // Vignette fade
    if (gs.vignetteActive) {
      gs.vignetteAnim = Math.min(gs.vignetteAnim + dt * 6, 1)
    } else if (gs.vignetteAnim > 0) {
      gs.vignetteAnim = Math.max(0, gs.vignetteAnim - dt * 3)
    }

    draw()

    const stillAnimating =
      gs.running ||
      gs.deathAnim < 1 ||
      gs.previewFading ||
      gs.vignetteActive ||
      gs.vignetteAnim > 0

    if (stillAnimating) {
      gs.rafId = requestAnimationFrame(loop)
    }
  }, [draw])

  // ── hitTrap ───────────────────────────────────────────────────────────────
  const hitTrap = useCallback((tx: number, ty: number) => {
    const gs = gsRef.current
    if (!gs) return
    const diff = diffRef.current

    gs.lives--
    gs.memory.push({ x: tx, y: ty })
    saveMemory(gs.memory, diff)
    playTone(90, 'sawtooth', 0.5, 0.35, soundRef.current)
    setTimeout(() => playTone(60, 'sawtooth', 0.7, 0.25, soundRef.current), 120)

    if (gs.lives <= 0) {
      // Game over — play death animation, THEN signal game-over to the UI
      gs.deathPos = { x: tx, y: ty }
      gs.deathAnim = 0
      // Keep running=true so RAF keeps ticking for the animation
      // but block movement via a separate flag
      gs.running = false

      if (gs.score > bestRef.current) {
        bestRef.current = gs.score
        saveBest(gs.score)
      }

      // Update score/trapCount immediately (lives=0 triggers screen change after animation)
      setUI(prev => ({
        ...prev,
        score:      gs.score,
        trapCount:  gs.memory.length,
        memorySize: gs.memory.length,
        best:       bestRef.current,
      }))

      // Keep RAF running for death animation
      if (!gs.rafId) gs.rafId = requestAnimationFrame(loop)

      // Signal game-over to the component after the death animation
      setTimeout(() => {
        setUI(prev => ({ ...prev, running: false, lives: 0 }))
      }, 900)
    } else {
      // Life lost — flash red vignette and teleport
      gs.deathPos     = { x: tx, y: ty }
      gs.deathAnim    = 0
      gs.vignetteActive = true
      gs.vignetteAnim   = 0
      updateUI()

      setTimeout(() => {
        const gs2 = gsRef.current
        if (!gs2) return
        gs2.deathPos      = null
        gs2.deathAnim     = 0
        gs2.vignetteActive = false
        gs2.player        = { x: 0, y: 0 }
        gs2.revealed.add(tkey(0, 0))
        gs2.footprints.add(tkey(0, 0))
        updateUI()
        if (!gs2.rafId) gs2.rafId = requestAnimationFrame(loop)
      }, 500)
    }
  }, [updateUI, loop])

  // ── move ──────────────────────────────────────────────────────────────────
  const move = useCallback((dx: number, dy: number) => {
    const gs = gsRef.current
    if (!gs || !gs.running || gs.previewPhase) return

    const nx = gs.player.x + dx
    const ny = gs.player.y + dy
    if (nx < 0 || ny < 0 || nx >= gs.gridSize || ny >= gs.gridSize) return

    gs.player = { x: nx, y: ny }
    gs.revealed.add(tkey(nx, ny))
    gs.footprints.add(tkey(nx, ny))
    gs.score++
    gs.stepCount++

    // Sound
    if (gs.score > 0 && gs.score % 20 === 0) {
      ;[440, 554, 660].forEach((f, i) =>
        setTimeout(() => playTone(f, 'sine', 0.14, 0.2, soundRef.current), i * 70),
      )
    } else {
      playTone(300, 'sine', 0.07, 0.12, soundRef.current)
    }

    // Throttled footprint save
    if (gs.stepCount % 5 === 0) {
      saveFootprints(gs.footprints, diffRef.current)
    }

    // Growing grid trigger
    if (nx === gs.gridSize - 1 && ny === gs.gridSize - 1 && gs.gridSize < MAX_GRID) {
      gs.gridSize += 2
      gs.traps = generateTraps(gs.gridSize, gs.traps)
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width  = gs.gridSize * TILE_PX
        canvas.height = gs.gridSize * TILE_PX
      }
    }

    updateUI()

    if (gs.traps.has(tkey(nx, ny))) {
      hitTrap(nx, ny)
    }
  }, [generateTraps, hitTrap, updateUI])

  // ── startGame ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Cancel existing RAF
    const prev = gsRef.current
    if (prev?.rafId) cancelAnimationFrame(prev.rafId)
    if (prev?.previewTimer) clearTimeout(prev.previewTimer)

    const diff     = diffRef.current
    const memory   = loadMemory(diff)
    const footprints = loadFootprints(diff)
    const traps    = generateTraps(10)

    canvas.width  = 10 * TILE_PX
    canvas.height = 10 * TILE_PX

    const gs: GameState = {
      running:       true,
      player:        { x: 0, y: 0 },
      traps,
      revealed:      new Set([tkey(0, 0)]),
      footprints,
      memory,
      score:         0,
      lives:         3,
      deathPos:      null,
      deathAnim:     0,
      lastTs:        null,
      rafId:         null,
      gridSize:      10,
      previewPhase:  true,
      previewTimer:  null,
      previewOpacity: 1,
      previewFading: false,
      stepCount:     0,
      canvasRef:     canvas,
      vignetteAnim:  0,
      vignetteActive: false,
    }

    gsRef.current = gs

    // Preview timer: hide after 2s with a 200ms fade
    gs.previewTimer = setTimeout(() => {
      const gs2 = gsRef.current
      if (!gs2) return
      gs2.previewPhase   = false
      gs2.previewFading  = true
      gs2.previewOpacity = 1
      updateUI()
    }, 2000)

    gs.rafId = requestAnimationFrame(loop)
    updateUI()
  }, [generateTraps, loop, updateUI])

  // ── setDifficulty ─────────────────────────────────────────────────────────
  const setDifficulty = useCallback((diff: DontStepDifficulty) => {
    diffRef.current = diff
    // Update best for new context
    bestRef.current = loadBest()
    setUI(prev => ({
      ...prev,
      best: bestRef.current,
      memorySize: loadMemory(diff).length,
      trapCount:  loadMemory(diff).length,
    }))
  }, [])

  // ── toggleSound ───────────────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    soundRef.current = !soundRef.current
    try { localStorage.setItem('dsoi_sound', soundRef.current ? 'on' : 'off') }
    catch {}
    return soundRef.current
  }, [])

  // ── dpad ──────────────────────────────────────────────────────────────────
  const dpad = useCallback((dx: number, dy: number) => move(dx, dy), [move])

  // ── Keyboard listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const KEY_MAP: Record<string, [number, number]> = {
      ArrowUp:    [0, -1], ArrowDown: [0, 1],
      ArrowLeft:  [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
    }
    function onKey(e: KeyboardEvent) {
      const dir = KEY_MAP[e.key]
      if (dir) { e.preventDefault(); move(dir[0], dir[1]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const gs = gsRef.current
      if (gs?.rafId) cancelAnimationFrame(gs.rafId)
      if (gs?.previewTimer) clearTimeout(gs.previewTimer)
    }
  }, [])

  return {
    canvasRef,
    state:       uiState,
    soundOn:     soundRef,
    diffRef,
    startGame,
    move,
    dpad,
    toggleSound,
    setDifficulty,
  }
}
