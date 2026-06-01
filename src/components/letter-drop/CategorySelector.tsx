'use client'

import type { Category } from '@/types/letterdrop'
import styles from './CategorySelector.module.css'

interface CategorySelectorProps {
  category: Category
  onChange: (c: Category) => void
  running: boolean
}

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'all',       label: 'All',       icon: '🔤' },
  { value: 'animals',   label: 'Animals',   icon: '🐾' },
  { value: 'geography', label: 'Geography', icon: '🌍' },
  { value: 'science',   label: 'Science',   icon: '⚗️' },
  { value: 'food',      label: 'Food',      icon: '🍽️' },
]

export default function CategorySelector({ category, onChange, running }: CategorySelectorProps) {
  return (
    <div className={styles.wrap} role="group" aria-label="Word category">
      <span className={styles.label}>Category</span>
      <div className={styles.pills}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`${styles.pill} ${category === cat.value ? styles.active : ''}`}
            onClick={() => onChange(cat.value)}
            disabled={running}
            aria-pressed={category === cat.value}
            title={running ? 'Change category before starting a new game' : undefined}
          >
            <span aria-hidden="true">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
      {running && (
        <p className={styles.note} aria-live="polite">
          Finish this game to change category
        </p>
      )}
    </div>
  )
}
