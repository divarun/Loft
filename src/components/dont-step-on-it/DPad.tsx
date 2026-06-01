'use client'

import styles from './DPad.module.css'

interface DPadProps {
  onMove: (dx: number, dy: number) => void
}

export default function DPad({ onMove }: DPadProps) {
  return (
    <div className={styles.dpad} aria-label="D-pad controls">
      <div className={styles.dpadRow}>
        <button
          className={styles.dpadBtn}
          onPointerDown={e => { e.preventDefault(); onMove(0, -1) }}
          aria-label="Move up"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5l-7 7 7 7" transform="rotate(90 12 12)" />
          </svg>
        </button>
      </div>
      <div className={styles.dpadRow}>
        <button
          className={styles.dpadBtn}
          onPointerDown={e => { e.preventDefault(); onMove(-1, 0) }}
          aria-label="Move left"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className={styles.dpadCenter} aria-hidden="true" />
        <button
          className={styles.dpadBtn}
          onPointerDown={e => { e.preventDefault(); onMove(1, 0) }}
          aria-label="Move right"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className={styles.dpadRow}>
        <button
          className={styles.dpadBtn}
          onPointerDown={e => { e.preventDefault(); onMove(0, 1) }}
          aria-label="Move down"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5l7 7-7 7" transform="rotate(-90 12 12)" />
          </svg>
        </button>
      </div>
    </div>
  )
}
