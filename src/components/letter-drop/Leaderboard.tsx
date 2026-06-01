'use client'

import { useEffect, useState } from 'react'
import styles from './Leaderboard.module.css'

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  date?: string
}

interface LeaderboardProps {
  currentName?: string
}

export default function Leaderboard({ currentName }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leaderboard?game=letter-drop&limit=10')
        if (!res.ok) throw new Error('failed')
        const data = await res.json() as LeaderboardEntry[]
        setEntries(data)
      } catch (_) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <p className={styles.empty}>Loading leaderboard…</p>
  }

  if (error) {
    return <p className={styles.empty}>Could not load leaderboard.</p>
  }

  if (entries.length === 0) {
    return <p className={styles.empty}>No entries yet — be the first to submit your score!</p>
  }

  return (
    <ol className={styles.list} aria-label="Top 10 leaderboard">
      {entries.map(entry => {
        const isYou = currentName && entry.name.toLowerCase() === currentName.toLowerCase()
        return (
          <li
            key={`${entry.rank}-${entry.name}`}
            className={`${styles.row} ${isYou ? styles.highlight : ''} ${entry.rank <= 3 ? styles.top : ''}`}
            aria-current={isYou ? 'true' : undefined}
          >
            <span className={styles.rank} aria-label={`Rank ${entry.rank}`}>
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
            </span>
            <span className={styles.name}>{entry.name}</span>
            {entry.date && (
              <span className={styles.date}>{entry.date}</span>
            )}
            <span className={styles.score}>{entry.score.toLocaleString()}</span>
          </li>
        )
      })}
    </ol>
  )
}
