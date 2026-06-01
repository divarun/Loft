'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { DontStepDifficulty } from '@/types/dontstep'
import { useDontStep } from '@/hooks/useDontStep'
import HUD from './HUD'
import DPad from './DPad'
import styles from './DontStepGame.module.css'

type Screen = 'start' | 'playing' | 'gameover'

export default function DontStepGame() {
  const [screen, setScreen]       = useState<Screen>('start')
  const [difficulty, setDiff]     = useState<DontStepDifficulty>('medium')
  const [copiedMsg, setCopiedMsg] = useState('')
  const [soundOn, setSoundOn]     = useState(true)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const {
    canvasRef,
    state,
    startGame,
    dpad,
    toggleSound,
    setDifficulty,
  } = useDontStep()

  // Sync sound state from localStorage on mount
  useEffect(() => {
    setSoundOn(localStorage.getItem('dsoi_sound') !== 'off')
  }, [])

  // Watch for game-over transition
  // Transition to game-over screen when hook signals game ended
  // The hook already waits 900ms for the death animation before setting running=false, lives=0
  const prevRunning = useRef(false)
  useEffect(() => {
    if (prevRunning.current && !state.running && screen === 'playing' && state.lives <= 0) {
      setScreen('gameover')
    }
    prevRunning.current = state.running
  }, [state.running, state.lives, screen])

  const handleStart = useCallback(() => {
    startGame()
    setScreen('playing')
  }, [startGame])

  const handleDifficultyChange = useCallback((d: DontStepDifficulty) => {
    setDiff(d)
    setDifficulty(d)
  }, [setDifficulty])

  const handleToggleSound = useCallback(() => {
    const next = toggleSound()
    setSoundOn(next)
  }, [toggleSound])

  // Touch swipe on canvas
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    e.preventDefault()
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) dpad(dx > 0 ? 1 : -1, 0)
    else                              dpad(0, dy > 0 ? 1 : -1)
    e.preventDefault()
  }, [dpad])

  const handleShare = useCallback(() => {
    const diffLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[difficulty]
    const livesLeft = state.lives > 0 ? state.lives : 0
    const text = [
      `👣 Don't Step On It [${diffLabel}]`,
      `Steps: ${state.score}  |  Best: ${state.best}`,
      `Traps memorized: ${state.trapCount}  |  Lives left: ${livesLeft}`,
    ].join('\n')

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedMsg('Copied!')
        setTimeout(() => setCopiedMsg(''), 2000)
      })
      .catch(() => {
        setCopiedMsg('Unable to copy')
        setTimeout(() => setCopiedMsg(''), 2000)
      })
  }, [difficulty, state])

  const DIFF_KEYS: DontStepDifficulty[] = ['easy', 'medium', 'hard']
  const DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

  return (
    <>
      {/* Skip link */}
      <a href="#main-content" className={styles.skipLink}>Skip to game</a>

      {/* ── NAV ── */}
      <header className={styles.topNav}>
        <div className={styles.navInner}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.backLink} aria-label="Back to All Games">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              All Games
            </Link>
            <div className={styles.navLogo} aria-hidden="true">
              Don&apos;t Step <em>On It</em>
            </div>
          </div>
          <button
            className={styles.btnSound}
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
            aria-pressed={!soundOn}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* ── HUD (shown while playing) ── */}
      {screen === 'playing' && (
        <HUD
          score={state.score}
          best={state.best}
          lives={state.lives}
          trapCount={state.trapCount}
          previewPhase={state.previewPhase}
        />
      )}

      {/* ── MAIN ── */}
      <main className={styles.main} id="main-content">

        {/* ─── START SCREEN ─── */}
        {screen === 'start' && (
          <div className={styles.screen} role="dialog" aria-modal="true" aria-labelledby="game-title">
            <div className={styles.screenInner}>
              <p className={styles.eyebrow}>Daily Minefield</p>
              <h1 className={styles.gameTitle} id="game-title">
                Don&apos;t Step <em>On It</em>
              </h1>
              <p className={styles.gameBlurb}>
                Navigate a blind 10×10 grid. Traps are invisible until you step on them.
                Reach the corner to grow the grid. Learn from each run — traps stay the same all day.
              </p>

              {/* How-to */}
              <div className={styles.howGrid} role="list" aria-label="How to play">
                <div className={styles.howItem} role="listitem">
                  <span className={styles.howKey}>↑↓←→</span>
                  <span>Arrow keys, WASD, or swipe to move</span>
                </div>
                <div className={styles.howItem} role="listitem">
                  <span className={styles.howKey}>🟢</span>
                  <span>Safe tile revealed — walk freely</span>
                </div>
                <div className={styles.howItem} role="listitem">
                  <span className={`${styles.howKey} ${styles.dangerKey}`}>● red</span>
                  <span>Ghost mark — a trap was here before</span>
                </div>
                <div className={styles.howItem} role="listitem">
                  <span className={styles.howKey}>3 ❤</span>
                  <span>3 lives — hit a trap, respawn at start</span>
                </div>
                <div className={styles.howItem} role="listitem">
                  <span className={styles.howKey}>⬛→⬛</span>
                  <span>Reach bottom-right corner to grow the grid</span>
                </div>
              </div>

              {/* Difficulty */}
              <div className={styles.diffRow} role="group" aria-label="Select difficulty">
                {DIFF_KEYS.map(d => (
                  <button
                    key={d}
                    className={`${styles.diffBtn} ${difficulty === d ? styles.diffBtnActive : ''}`}
                    onClick={() => handleDifficultyChange(d)}
                    aria-pressed={difficulty === d}
                  >
                    {DIFF_LABELS[d]}
                  </button>
                ))}
              </div>

              {/* Personal best */}
              <p className={styles.bestDisplay}>
                {state.best > 0 ? `Personal best: ${state.best} steps` : ''}
              </p>

              <button className={styles.btnPrimary} onClick={handleStart}>
                Start Game
              </button>
            </div>
          </div>
        )}

        {/* ─── GAME AREA ─── */}
        {screen === 'playing' && (
          <div className={styles.gameArea}>
            <div className={styles.canvasWrap}>
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                aria-label="Don't Step On It game grid"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
              {state.previewPhase && (
                <div className={styles.previewBanner} aria-hidden="true">
                  Memorize the safe path...
                </div>
              )}
            </div>
            <DPad onMove={dpad} />
          </div>
        )}

        {/* ─── GAME OVER SCREEN ─── */}
        {screen === 'gameover' && (
          <div className={styles.screen} role="dialog" aria-modal="true" aria-labelledby="gameover-title">
            <div className={styles.screenInner}>
              <p className={styles.deathLabel}>YOU STEPPED ON IT</p>
              <h2 className={styles.resultTitle} id="gameover-title">
                Better luck tomorrow
              </h2>

              {/* Stats */}
              <div className={styles.goStats}>
                <div className={styles.goStat}>
                  <span className={styles.goVal}>{state.score}</span>
                  <span className={styles.goLbl}>Steps taken</span>
                </div>
                <div className={styles.goStat}>
                  <span className={styles.goVal}>{state.best}</span>
                  <span className={styles.goLbl}>Personal best</span>
                </div>
                <div className={styles.goStat}>
                  <span className={styles.goVal}>{state.trapCount}</span>
                  <span className={styles.goLbl}>Traps memorized</span>
                </div>
                <div className={styles.goStat}>
                  <span className={styles.goVal}>{state.gridSize}</span>
                  <span className={styles.goLbl}>Grid size</span>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.goActions}>
                <button className={styles.btnPrimary} onClick={handleStart}>
                  Try Again
                </button>
                <button className={styles.btnGhost} onClick={handleShare} aria-label="Share your score">
                  Share
                </button>
              </div>
              <p className={styles.copiedMsg} aria-live="polite">{copiedMsg}</p>

              {/* Difficulty selector */}
              <div className={styles.diffRow} role="group" aria-label="Change difficulty">
                {DIFF_KEYS.map(d => (
                  <button
                    key={d}
                    className={`${styles.diffBtn} ${difficulty === d ? styles.diffBtnActive : ''}`}
                    onClick={() => handleDifficultyChange(d)}
                    aria-pressed={difficulty === d}
                  >
                    {DIFF_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
