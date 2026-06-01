'use client'

import { useState } from 'react'
import type { Puzzle } from '@/types/bridge'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  puzzle: Puzzle
  chain: string[]
  score: number
  totalWrong: number
  won: boolean
  shareText: string
  onCopyShare: () => Promise<void>
  onNextPuzzle: () => void
  mode: 'daily' | 'practice' | 'ai'
}

export default function ResultCard({
  puzzle,
  chain,
  score,
  totalWrong,
  won,
  shareText,
  onCopyShare,
  onNextPuzzle,
  mode,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await onCopyShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hops = chain.length - 1

  // Build the "correct" chain for loss case
  const displayChain = won
    ? chain
    : [puzzle.start, ...puzzle.steps.map(s => s.correct)]

  return (
    <section
      className={`${styles.card} ${won ? styles.cardWin : styles.cardLoss}`}
      aria-label={won ? 'Puzzle complete — you won!' : 'Puzzle over — you ran out of points'}
    >
      <div className={styles.top}>
        <span className={styles.icon} aria-hidden="true">
          {won ? '🎉' : '💡'}
        </span>
        <div className={styles.titleBlock}>
          <p className={styles.title}>
            {won ? 'Bridge Complete!' : 'Bridge Incomplete'}
          </p>
          <p className={styles.sub}>
            {won
              ? `You connected ${puzzle.start} to ${puzzle.target}`
              : `Here's the intended path`}
          </p>
        </div>
      </div>

      {/* Word chain */}
      <div className={styles.chainDisplay} aria-label="Word chain">
        {displayChain.map((word, i) => {
          const isFirst = i === 0
          const isLast = i === displayChain.length - 1

          let wordClass = styles.chainMid
          if (isFirst) wordClass = styles.chainStart
          else if (isLast && won) wordClass = styles.chainEnd
          else if (isLast && !won) wordClass = styles.chainEndMiss

          return (
            <span key={`${word}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              {i > 0 && <span className={styles.chainArrow} aria-hidden="true">→</span>}
              <span className={wordClass}>{word.toUpperCase()}</span>
            </span>
          )
        })}
      </div>

      {/* Fun fact */}
      <blockquote className={styles.fact}>{puzzle.fact}</blockquote>

      {/* Stats */}
      <div className={styles.scores}>
        <div className={styles.statBox}>
          <div className={styles.statN}>{score}</div>
          <div className={styles.statL}>Score</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statN}>{hops}</div>
          <div className={styles.statL}>Hops</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statN}>{totalWrong}</div>
          <div className={styles.statL}>Misses</div>
        </div>
      </div>

      {/* Share */}
      <div className={styles.shareBox} aria-label="Share text" tabIndex={0}>
        {shareText}
      </div>
      <button
        className={styles.copyBtn}
        onClick={handleCopy}
        aria-label="Copy share text to clipboard"
      >
        {copied ? '✓ Copied!' : 'Copy Result'}
      </button>
      {copied && (
        <p className={styles.copiedMsg} role="status" aria-live="polite">
          Copied to clipboard!
        </p>
      )}

      {/* Next puzzle */}
      {mode !== 'daily' && (
        <div className={styles.nextRow}>
          <button className={styles.nextBtn} onClick={onNextPuzzle}>
            Next Puzzle →
          </button>
        </div>
      )}
      {mode === 'daily' && (
        <div className={styles.nextRow}>
          <button className={styles.nextBtn} onClick={onNextPuzzle}>
            Play Practice Mode →
          </button>
        </div>
      )}
    </section>
  )
}
