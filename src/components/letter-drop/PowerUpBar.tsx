'use client'

import type { PowerUp, PowerUpType } from '@/types/letterdrop'
import styles from './PowerUpBar.module.css'

interface PowerUpBarProps {
  powerUps: PowerUp[]
  onActivate: (type: PowerUpType) => void
  running: boolean
}

const POWERUP_META: Record<PowerUpType, { icon: string; label: string; desc: string }> = {
  slow:   { icon: '⏱',  label: 'Slow',   desc: 'Halves tile speed for 5s' },
  freeze: { icon: '❄️', label: 'Freeze', desc: 'Freezes all tiles for 3s' },
  reveal: { icon: '👁',  label: 'Reveal', desc: 'Shows the nearest tile\'s answer briefly' },
}

export default function PowerUpBar({ powerUps, onActivate, running }: PowerUpBarProps) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0

  return (
    <div className={styles.bar} role="group" aria-label="Power-ups">
      {powerUps.map(pu => {
        const meta = POWERUP_META[pu.type]
        const isOnCooldown = pu.cooldownUntil > now
        const isDisabled   = !pu.available || !running || isOnCooldown
        const secondsLeft  = isOnCooldown ? Math.ceil((pu.cooldownUntil - now) / 1000) : 0

        return (
          <button
            key={pu.type}
            className={`${styles.btn} ${pu.available && running ? styles.available : ''} ${isOnCooldown ? styles.cooldown : ''}`}
            onClick={() => onActivate(pu.type)}
            disabled={isDisabled}
            title={meta.desc}
            aria-label={`${meta.label}: ${pu.available ? 'ready' : isOnCooldown ? `cooldown ${secondsLeft}s` : 'not yet earned'}`}
            aria-pressed={isOnCooldown}
          >
            <span className={styles.icon} aria-hidden="true">{meta.icon}</span>
            <span className={styles.label}>{meta.label}</span>
            {isOnCooldown && (
              <span className={styles.cooldownTimer} aria-hidden="true">{secondsLeft}s</span>
            )}
            {!pu.available && !isOnCooldown && running && (
              <span className={styles.locked} aria-hidden="true">🔒</span>
            )}
            {pu.available && !isOnCooldown && (
              <span className={styles.ready} aria-hidden="true">●</span>
            )}
          </button>
        )
      })}
      <p className={styles.hint} aria-live="polite">
        {running ? 'Earn charges every 7 words' : ''}
      </p>
    </div>
  )
}
