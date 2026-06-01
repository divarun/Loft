'use client'

import { useState, useRef, useCallback, useId } from 'react'
import styles from './GuessInput.module.css'

interface GuessInputProps {
  suggestions: string[]
  onInput: (val: string) => void
  onSubmit: (val: string) => void
  onSelect: (val: string) => void
  disabled: boolean
  feedback: string
  distanceFeedback: string | null
}

export default function GuessInput({
  suggestions,
  onInput,
  onSubmit,
  onSelect,
  disabled,
  feedback,
  distanceFeedback,
}: GuessInputProps) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(-1)
  const [hasError, setHasError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const inputId = useId()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setValue(val)
      setFocused(-1)
      onInput(val)
      setHasError(false)
    },
    [onInput]
  )

  const handleSubmit = useCallback(() => {
    const v = value.trim()
    if (!v || disabled) return
    const submitted = focused >= 0 && suggestions[focused] ? suggestions[focused] : v
    onSubmit(submitted)
    setValue('')
    setFocused(-1)
    onInput('')
    // Trigger error shake if feedback is present — parent handles this
  }, [value, focused, suggestions, disabled, onSubmit, onInput])

  const handleSelect = useCallback(
    (name: string) => {
      setValue('')
      setFocused(-1)
      onInput('')
      onSelect(name)
    },
    [onInput, onSelect]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocused((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocused((prev) => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (focused >= 0 && suggestions[focused]) {
          handleSelect(suggestions[focused])
        } else {
          handleSubmit()
        }
      } else if (e.key === 'Escape') {
        setFocused(-1)
        onInput('')
        setValue('')
      }
    },
    [suggestions, focused, handleSelect, handleSubmit, onInput]
  )

  // Trigger error animation on new feedback
  const prevFeedback = useRef('')
  if (feedback && feedback !== prevFeedback.current) {
    prevFeedback.current = feedback
    setHasError(true)
    setTimeout(() => setHasError(false), 400)
  }

  const showSuggestions = suggestions.length > 0 && !disabled

  function highlightMatch(name: string, query: string) {
    if (!query) return <span>{name}</span>
    const idx = name.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <span>{name}</span>
    return (
      <>
        {name.slice(0, idx)}
        <mark>{name.slice(idx, idx + query.length)}</mark>
        {name.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={`${styles.input}${hasError ? ` ${styles.wrong}` : ''}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Scroll into view on mobile keyboard pop
            setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
          }}
          placeholder="Type a country name…"
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Guess the country"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-expanded={showSuggestions}
          aria-activedescendant={focused >= 0 ? `${listboxId}-item-${focused}` : undefined}
          role="combobox"
        />
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Submit guess"
        >
          Guess
        </button>
      </div>

      {showSuggestions && (
        <ul
          id={listboxId}
          className={styles.suggestions}
          role="listbox"
          aria-label="Country suggestions"
        >
          {suggestions.map((name, i) => (
            <li
              key={name}
              id={`${listboxId}-item-${i}`}
              className={`${styles.sugItem}${i === focused ? ` ${styles.focused}` : ''}`}
              role="option"
              aria-selected={i === focused}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(name)
              }}
              tabIndex={-1}
            >
              {highlightMatch(name, value)}
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <p className={styles.feedback} role="alert" aria-live="assertive">
          {feedback}
        </p>
      )}
      {distanceFeedback && (
        <p className={styles.distanceFeedback} aria-live="polite">
          {distanceFeedback}
        </p>
      )}
    </div>
  )
}
