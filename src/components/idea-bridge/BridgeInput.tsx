'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent, FormEvent } from 'react'
import styles from './BridgeInput.module.css'

interface BridgeInputProps {
  onSubmit: (input: string) => void
  validating: boolean
  disabled: boolean
  hint?: string | null
  wrongFeedback?: string | null
  explanation?: string | null
}

export default function BridgeInput({
  onSubmit,
  validating,
  disabled,
  hint,
  wrongFeedback,
  explanation,
}: BridgeInputProps) {
  const [value, setValue] = useState('')
  const [shakeWrong, setShakeWrong] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevWrongRef = useRef<string | null>(null)

  // Shake input on new wrong feedback
  useEffect(() => {
    if (wrongFeedback && wrongFeedback !== prevWrongRef.current) {
      prevWrongRef.current = wrongFeedback
      setShakeWrong(true)
      setTimeout(() => setShakeWrong(false), 440)
    }
  }, [wrongFeedback])

  // Clear input after successful submission (explanation shown means step passed)
  useEffect(() => {
    if (explanation) {
      setValue('')
    }
  }, [explanation])

  // Focus input when not disabled
  useEffect(() => {
    if (!disabled && !validating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [disabled, validating])

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || validating || disabled) return
    onSubmit(trimmed)
    setValue('')
  }, [value, validating, disabled, onSubmit])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }, [handleSubmit])

  const isSubmitDisabled = disabled || validating || !value.trim()

  return (
    <div className={styles.wrapper}>
      {/* Explanation after correct step */}
      {explanation && (
        <div
          className={`${styles.feedback} ${styles.feedbackExplain}`}
          role="status"
          aria-live="polite"
          aria-label="Correct! Step explanation"
        >
          <span className={styles.feedbackIcon} aria-hidden="true">
            ✓
          </span>
          <span>{explanation}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.inputRow} noValidate>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.input}${hint ? ` ${styles.hasHint}` : ''}${shakeWrong ? ` ${styles.shakeWrong}` : ''}`}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hint ? `Hint: ${hint}` : 'Type a connecting word…'}
          disabled={disabled || validating}
          aria-label="Enter connecting word"
          aria-describedby={
            wrongFeedback ? 'bridge-feedback-wrong' : explanation ? 'bridge-feedback-explain' : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitDisabled}
          aria-label={validating ? 'Validating…' : 'Submit word'}
        >
          {validating ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Checking…
            </>
          ) : (
            'Submit'
          )}
        </button>
      </form>

      {hint && !wrongFeedback && !explanation && (
        <p className={styles.hintNote} aria-live="polite">
          Hint revealed — type the hint word or a valid connection
        </p>
      )}

      {/* Wrong feedback */}
      {wrongFeedback && !explanation && (
        <div
          id="bridge-feedback-wrong"
          className={`${styles.feedback} ${styles.feedbackWrong}`}
          role="alert"
          aria-live="assertive"
        >
          <span className={styles.feedbackIcon} aria-hidden="true">
            ✗
          </span>
          <span>{wrongFeedback}</span>
        </div>
      )}
    </div>
  )
}
