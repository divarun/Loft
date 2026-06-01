'use client'

import { useState, useEffect } from 'react'
import type { Country } from '@/types/atlas'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  country: Country
  won: boolean
  score: number
  cluesUsed: number
  streak: number
  shareText: string
  onNext?: () => void
  onCopyShare: () => void
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

  // Strip URL from the display block; the full text (with URL) goes to clipboard via onCopyShare
  const displayShareText = shareText.replace(/\nhttps?:\/\/[^\n]+/g, '')

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
        {displayShareText}
      </div>

      <button type="button" className={styles.shareBtn} onClick={handleCopy} aria-label="Copy share text to clipboard">
        {copied ? '✓ Copied!' : 'Copy & Share'}
      </button>
      {copied && <p className={styles.copiedMsg} role="status" aria-live="polite">Copied to clipboard!</p>}

      {onNext && (
        <div className={styles.nextRow}>
          <button type="button" className={styles.nextBtn} onClick={onNext} aria-label="Play next country">
            Next Country →
          </button>
        </div>
      )}

    </div>
  )
}
