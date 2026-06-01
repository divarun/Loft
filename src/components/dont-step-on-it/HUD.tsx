'use client'

import styles from './HUD.module.css'

interface HUDProps {
  score:        number
  best:         number
  lives:        number
  trapCount:    number
  previewPhase: boolean
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <span className={`${styles.heart} ${filled ? '' : styles.heartLost}`} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </span>
  )
}

export default function HUD({ score, best, lives, trapCount, previewPhase }: HUDProps) {
  return (
    <div className={styles.hud} role="status" aria-live="polite" aria-atomic="false">
      {/* Steps */}
      <div className={styles.stat}>
        <span className={styles.label}>Steps</span>
        <span key={score} className={styles.value}>{score}</span>
      </div>

      {/* Best */}
      <div className={styles.stat}>
        <span className={styles.label}>Best</span>
        <span className={styles.value}>{best}</span>
      </div>

      {/* Lives */}
      <div className={styles.stat}>
        <span className={styles.label}>Lives</span>
        <div key={lives} className={styles.livesRow} aria-label={`${lives} lives remaining`}>
          <HeartIcon filled={lives >= 1} />
          <HeartIcon filled={lives >= 2} />
          <HeartIcon filled={lives >= 3} />
        </div>
      </div>

      {/* Trap counter */}
      <div className={styles.stat}>
        <span className={styles.label}>Memory</span>
        <span key={trapCount} className={styles.trapCount}>{trapCount} traps memorized</span>
      </div>

      {/* Preview phase banner — full width row */}
      {previewPhase && (
        <div className={styles.previewBanner} aria-live="polite">
          Memorize the safe path...
        </div>
      )}
    </div>
  )
}
