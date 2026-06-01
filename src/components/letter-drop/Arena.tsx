'use client'

import type { RefObject } from 'react'
import styles from './LetterDropGame.module.css'

interface ArenaProps {
  arenaRef: RefObject<HTMLDivElement | null>
  groundRef: RefObject<HTMLDivElement | null>
  running: boolean
  onStart: () => void
}

export default function Arena({ arenaRef, groundRef, running, onStart }: ArenaProps) {
  return (
    <div className={styles.arenaWrap}>
      {/* Danger zone line */}
      <div className={styles.dangerLabel} aria-hidden="true">
        danger zone
      </div>

      {/* Game arena — tiles are appended imperatively */}
      <div
        ref={arenaRef as RefObject<HTMLDivElement>}
        className={styles.arena}
        aria-live="off"
        aria-label="Game arena"
      />

      {/* Ground */}
      <div
        ref={groundRef as RefObject<HTMLDivElement>}
        className={styles.ground}
        aria-hidden="true"
      />

      {/* Start screen overlay */}
      {!running && (
        <div className={styles.startScreen} role="region" aria-label="Start screen">
          <p className={styles.startTitle}>
            Letter<em>Drop</em>
          </p>
          <p className={styles.startSub}>
            Scrambled word tiles fall from above.<br />
            Type the unscrambled word &amp; press Enter before they hit the ground.
          </p>
          <button
            className={styles.btnPrimary}
            onClick={onStart}
            autoFocus
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  )
}
