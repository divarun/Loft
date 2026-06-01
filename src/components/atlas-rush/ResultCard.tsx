'use client'

import { useState, useEffect } from 'react'
import type { Country } from '@/types/atlas'
import styles from './ResultCard.module.css'

interface DailyStats {
  totalPlays: number
  totalWins: number
  avgScore: number
  clueDistribution: Record<string, number>
}

interface ResultCardProps {
  country: Country
  won: boolean
  score: number
  cluesUsed: number
  streak: number
  shareText: string
  onNext?: () => void
  onCopyShare: () => void
  dailyStats?: DailyStats | null
  isDaily: boolean
}

const CLUE_LABELS: Record<number, string> = {
  1: 'Continent',
  2: '+ Pop.',
  3: '+ Borders',
  4: '+ Capital',
  5: '+ Shape',
  6: '+ Flag',
  7: '+ Hint',
}

export default function ResultCard({
  country,
  won,
  score,
  cluesUsed,
  streak,
  shareText,
  onNext,
  onCopyShare,
  dailyStats,
  isDaily,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  // Auto-focus for accessibility
  useEffect(() => {
    const el = document.getElementById('result-card-heading')
    el?.focus()
  }, [])

  function handleCopy() {
    onCopyShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const winRate = dailyStats && dailyStats.totalPlays > 0
    ? Math.round((dailyStats.totalWins / dailyStats.totalPlays) * 100)
    : 0

  const maxDist = dailyStats
    ? Math.max(1, ...Object.values(dailyStats.clueDistribution))
    : 1

  return (
    <div
      className={`${styles.card} ${won ? styles.cardWin : styles.cardLoss}`}
      aria-live="polite"
    >
      <div className={styles.flagWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/w160/${country.code}.webp`}
          alt={`Flag of ${country.name}`}
          className={styles.flagImg}
          width={90}
          height={60}
          onError={(e) => {
            // fallback to emoji flag text
            const target = e.currentTarget
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              const span = document.createElement('span')
              span.style.fontSize = '3rem'
              span.textContent = country.flag
              parent.appendChild(span)
            }
          }}
        />
      </div>

      <h2 id="result-card-heading" className={styles.countryName} tabIndex={-1}>
        {country.name}
      </h2>
      <p className={styles.subtitle}>
        {won
          ? `Identified in ${cluesUsed} clue${cluesUsed !== 1 ? 's' : ''}!`
          : 'Better luck next time!'}
      </p>

      <div className={styles.stats} aria-label="Round statistics">
        <div className={styles.statBox}>
          <div className={styles.statN}>{won ? score : 0}</div>
          <div className={styles.statLbl}>Score</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statN}>{cluesUsed}</div>
          <div className={styles.statLbl}>Clues</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statN}>{streak}</div>
          <div className={styles.statLbl}>Streak</div>
        </div>
      </div>

      {country.fact && (
        <p className={styles.fact}>
          {country.fact}
        </p>
      )}

      <div
        className={styles.shareBlock}
        role="textbox"
        aria-readonly="true"
        aria-label="Share text"
        tabIndex={0}
      >
        {shareText}
      </div>

      <button type="button" className={styles.shareBtn} onClick={handleCopy} aria-label="Copy share text to clipboard">
        {copied ? '✓ Copied!' : 'Copy & Share'}
      </button>
      {copied && <p className={styles.copiedMsg} role="status" aria-live="polite">Copied to clipboard!</p>}

      {!isDaily && onNext && (
        <div className={styles.nextRow}>
          <button type="button" className={styles.nextBtn} onClick={onNext} aria-label="Play next country">
            Next Country →
          </button>
        </div>
      )}

      {dailyStats && (
        <div className={styles.dailyStats} aria-label="Today's global statistics">
          <p className={styles.dailyStatsTitle}>Today&rsquo;s Results</p>
          <p className={styles.dailyStatsRow}>
            <strong>{dailyStats.totalPlays}</strong> people played today.{' '}
            <strong>{winRate}%</strong> won.{' '}
            Average score: <strong>{Math.round(dailyStats.avgScore)}</strong>
          </p>

          {Object.keys(dailyStats.clueDistribution).length > 0 && (
            <>
              <p className={styles.chartTitle}>Clues needed to win</p>
              <div className={styles.chart} aria-label="Bar chart of clues used distribution">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => {
                  const count = dailyStats.clueDistribution[String(n)] ?? 0
                  const width = maxDist > 0 ? (count / maxDist) * 100 : 0
                  return (
                    <div key={n} className={styles.chartRow}>
                      <span className={styles.chartLabel}>{CLUE_LABELS[n]}</span>
                      <div className={styles.chartBarWrap} role="presentation">
                        <div
                          className={styles.chartBar}
                          style={{ width: `${width}%` }}
                          aria-label={`${count} wins with ${n} clue${n !== 1 ? 's' : ''}`}
                        />
                      </div>
                      <span className={styles.chartCount}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
