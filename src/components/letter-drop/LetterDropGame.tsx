'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLetterDrop } from '@/hooks/useLetterDrop'
import Arena from './Arena'
import CategorySelector from './CategorySelector'
import PowerUpBar from './PowerUpBar'
import styles from './LetterDropGame.module.css'

type Tab = 'play' | 'how' | 'scores'

interface LocalScore {
  score:       number
  words:       number
  level:       number
  maxCombo:    number
  clutch:      number
  longestWord: string
  date:        string
}

export default function LetterDropGame() {
  const {
    state,
    arenaRef,
    groundRef,
    inputRef,
    startGame,
    submitAnswer,
    togglePause,
    toggleSound,
    applyPowerUp,
    setCategory,
    copyShare,
  } = useLetterDrop()

  const [tab,        setTab]        = useState<Tab>('play')
  const [inputVal,   setInputVal]   = useState('')
  const [feedback,   setFeedback]   = useState('')
  const [feedGood,   setFeedGood]   = useState(false)
  const [soundOn,    setSoundOn]    = useState(true)
  const [localScores, setLocalScores] = useState<LocalScore[]>([])
  const [copied,     setCopied]     = useState(false)
  const [shareText,  setShareText]  = useState('')
  const [gameOver,   setGameOver]   = useState(false)

  // Input animation class
  const [inputClass, setInputClass] = useState<'' | 'correct' | 'wrong'>('')
  const feedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep sound UI in sync with hook ref
  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ld_sound') : null
    setSoundOn(saved !== '0')
  }, [])

  // Load local scores on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ld_scores') || '[]') as LocalScore[]
      setLocalScores(saved)
    } catch (_) {}
  }, [])

  // Intercept feedback from game state changes
  const prevWordsRef = useRef(0)
  const prevLivesRef = useRef(3)
  const prevScoreRef = useRef(0)

  // Show feedback when correct answer is submitted (state changes)
  useEffect(() => {
    if (!state.running) return

    // Words correct increased → correct answer feedback
    if (state.wordsCorrect > prevWordsRef.current) {
      const pts = state.score - prevScoreRef.current
      const comboStr = state.combo > 1 ? ` ×${state.combo} COMBO` : ''
      // Detect clutch: clutchSaves increased this turn
      const clutchIncreased = state.clutchSaves > 0 &&
        (state.clutchSaves > (prevWordsRef.current === 0 ? 0 : state.clutchSaves - 1))
      const clutchStr = clutchIncreased ? ' 🔥 CLUTCH SAVE!' : ''
      showFeedback(`+${pts}${comboStr}${clutchStr}`, true)

      // Level-up message after short delay
      if (state.level > Math.ceil(prevWordsRef.current / 5) && prevWordsRef.current > 0) {
        const tierLabels: Record<number, string> = { 3: 'Medium', 5: 'Hard', 7: 'Expert' }
        const tier = tierLabels[state.level] ?? (state.level >= 7 ? 'Expert' : 'Medium')
        setTimeout(() => showFeedback(`Level ${state.level}! Now: ${tier} words`, true), 600)
      }
    }

    prevWordsRef.current = state.wordsCorrect
    prevScoreRef.current = state.score
  }, [state.wordsCorrect, state.score, state.combo, state.level, state.running, state.clutchSaves])

  useEffect(() => {
    if (state.lives < prevLivesRef.current && state.running) {
      showFeedback('Missed a word — −1 life', false)
    }
    prevLivesRef.current = state.lives
  }, [state.lives, state.running])

  // When game ends, open overlay
  useEffect(() => {
    if (!state.running && (state.wordsCorrect > 0 || state.score > 0)) {
      setGameOver(true)
      // Refresh share text
      const stars = state.score >= 500 ? '⭐⭐⭐' : state.score >= 200 ? '⭐⭐' : '⭐'
      const clutchTag = state.clutchSaves > 0 ? ` · 🔥 ${state.clutchSaves} clutch save${state.clutchSaves > 1 ? 's' : ''}` : ''
      const longestTag = state.longestWord ? ` · Best: ${state.longestWord}` : ''
      const comboTag = state.maxCombo > 1 ? ` · Max combo ×${state.maxCombo}` : ''
      setShareText([
        'LetterDrop 🔤',
        stars,
        `Score: ${state.score} | Words: ${state.wordsCorrect} | Level: ${state.level}`,
        `${clutchTag}${longestTag}${comboTag}`.trim() || null,
      ].filter(Boolean).join('\n'))

      // Reload local scores
      try {
        const saved = JSON.parse(localStorage.getItem('ld_scores') || '[]') as LocalScore[]
        setLocalScores(saved)
      } catch (_) {}
    }
  }, [state.running]) // eslint-disable-line react-hooks/exhaustive-deps

  function showFeedback(msg: string, good: boolean) {
    setFeedback(msg)
    setFeedGood(good)
    if (feedTimerRef.current) clearTimeout(feedTimerRef.current)
    feedTimerRef.current = setTimeout(() => setFeedback(''), 2500)
  }

  const handleStart = useCallback(() => {
    setGameOver(false)
    setFeedback('')
    setInputVal('')
    prevWordsRef.current = 0
    prevLivesRef.current = 3
    prevScoreRef.current = 0
    startGame()
  }, [startGame])

  const handleSubmit = useCallback(() => {
    const raw = inputVal.trim().toUpperCase()
    if (!raw || !state.running || state.paused) return

    const result = submitAnswer(raw)

    if (result === 'correct') {
      setInputClass('correct')
      setTimeout(() => setInputClass(''), 380)
    } else if (result === 'wrong') {
      setInputClass('wrong')
      showFeedback('No match — keep trying!', false)
      setTimeout(() => setInputClass(''), 380)
    }

    setInputVal('')
    if (inputRef.current) inputRef.current.value = ''
  }, [inputVal, state.running, state.paused, submitAnswer, inputRef])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }, [handleSubmit])

  const handleSoundToggle = useCallback(() => {
    const next = toggleSound()
    setSoundOn(next)
  }, [toggleSound])

  const handleCopy = useCallback(() => {
    copyShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }, [copyShare])

  const subMsg = state.wordsCorrect >= 15
    ? 'Phenomenal vocabulary!'
    : state.wordsCorrect >= 8
    ? 'Nice run!'
    : 'The letters got the better of you.'

  return (
    <div className={styles.gameWrap}>
      {/* ── TABS + SOUND ── */}
      <div className={styles.tabsRow}>
        <nav className={styles.tabs} role="tablist" aria-label="Game sections">
          {(['play', 'how', 'scores'] as Tab[]).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'play' ? 'Play' : t === 'how' ? 'How to Play' : 'Best Scores'}
            </button>
          ))}
        </nav>
        <button
          className={styles.btnSound}
          onClick={handleSoundToggle}
          aria-label={soundOn ? 'Sound on — click to mute' : 'Sound off — click to unmute'}
          aria-pressed={!soundOn}
          title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* ── PLAY TAB ── */}
      {tab === 'play' && (
        <div role="tabpanel" aria-label="Play">

          {/* Stats bar */}
          <div className={styles.topBar} role="region" aria-label="Game stats" aria-live="polite">
            <div className={styles.statChip}>
              <div key={state.score} className={`${styles.statN}`} id="stat-score" aria-label={`Score: ${state.score}`}>
                {state.score}
              </div>
              <div className={styles.statL}>Score</div>
            </div>
            <div className={styles.statChip}>
              <div key={state.wordsCorrect} className={`${styles.statN}`} id="stat-words" aria-label={`Words: ${state.wordsCorrect}`}>
                {state.wordsCorrect}
              </div>
              <div className={styles.statL}>Words</div>
            </div>
            <div className={styles.statChip}>
              <div key={state.level} className={`${styles.statN} ${styles.statNGreen}`} id="stat-level" aria-label={`Level: ${state.level}`}>
                {state.level}
              </div>
              <div className={styles.statL}>Level</div>
            </div>
            <div className={styles.statChip}>
              <div key={state.combo} className={`${styles.statN} ${styles.statNWarn}`} id="stat-combo" aria-label={`Combo: ${state.combo}`}>
                ×{state.combo}
              </div>
              <div className={styles.statL}>Combo</div>
            </div>
          </div>

          {/* Category selector */}
          <CategorySelector
            category={state.category}
            onChange={setCategory}
            running={state.running}
          />

          {/* Arena */}
          <Arena
            arenaRef={arenaRef}
            groundRef={groundRef}
            running={state.running}
            onStart={handleStart}
          />

          {/* Bottom row: lives, level badge, pause */}
          <div className={styles.bottomRow}>
            <div className={styles.livesRow} aria-label={`Lives: ${state.lives} of 3`}>
              {[0, 1, 2].map(i => (
                <svg
                  key={i}
                  className={`${styles.heart} ${i >= state.lives ? styles.heartLost : ''}`}
                  width="18" height="18"
                  viewBox="0 0 24 24"
                  fill={i < state.lives ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ))}
            </div>
            <span className={styles.levelBadge} aria-hidden="true">Level {state.level}</span>
            <button
              className={styles.btnGhost}
              onClick={togglePause}
              disabled={!state.running}
              aria-label={state.paused ? 'Resume game' : 'Pause game'}
              aria-pressed={state.paused}
            >
              {state.paused ? 'Resume' : 'Pause'}
            </button>
          </div>

          {/* Power-ups */}
          <PowerUpBar
            powerUps={state.powerUps}
            onActivate={applyPowerUp}
            running={state.running}
          />

          {/* Input */}
          <div className={styles.inputSection}>
            <p className={styles.inputPrompt}>
              <strong className={styles.inputPromptStrong}>Type the unscrambled word</strong> and press Enter
            </p>
            <div className={styles.inputRow}>
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className={`${styles.answerInput} ${inputClass === 'correct' ? styles.answerInputCorrect : ''} ${inputClass === 'wrong' ? styles.answerInputWrong : ''}`}
                type="text"
                placeholder="ANSWER..."
                value={inputVal}
                onChange={e => setInputVal(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                disabled={!state.running || state.paused}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Your answer"
                maxLength={12}
              />
              <button
                className={`${styles.btnPrimary} ${styles.btnSubmit}`}
                onClick={handleSubmit}
                disabled={!state.running || state.paused}
                aria-label="Submit answer"
              >
                ↵
              </button>
            </div>
          </div>

          {/* Feedback */}
          <div
            className={`${styles.feedback} ${feedGood ? styles.feedbackGood : ''}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {feedback}
          </div>

          {/* Definition strip */}
          <div className={`${styles.defStrip} ${!feedback ? styles.defStripFaded : ''}`} aria-live="polite">
            {state.lastDefWord
              ? <><strong className={styles.defStripWord}>{state.lastDefWord}</strong> — {state.lastDef.replace(/^[^:]+: /, '')}</>
              : state.lastDef
            }
          </div>
        </div>
      )}

      {/* ── HOW TO PLAY TAB ── */}
      {tab === 'how' && (
        <div role="tabpanel" aria-label="How to play">
          <ol className={styles.howList}>
            {[
              [<>Scrambled word tiles <strong className={styles.howTextStrong}>fall from the top</strong> of the arena.</>, ''],
              [<><strong className={styles.howTextStrong}>Type the unscrambled word</strong> in the input and press Enter to solve it.</>, ''],
              [<>You have <strong className={styles.howTextStrong}>3 lives</strong>. A tile hitting the ground costs one life.</>, ''],
              [<><strong className={styles.howTextStrong}>Combo</strong>: solve words back-to-back (within 5s) to multiply your points up to ×4.</>, ''],
              [<><strong className={styles.howTextStrong}>Clutch Save</strong>: solving a tile in the danger zone (bottom 60px) earns a 50% bonus.</>, ''],
              [<>Every <strong className={styles.howTextStrong}>5 words solved</strong> = level up. Tiles fall faster, words get harder.</>, ''],
              [<><strong className={styles.howTextStrong}>Power-ups</strong> charge every 7 words: Slow (halve speed), Freeze (pause tiles), Reveal (show answer).</>, ''],
              [<><strong className={styles.howTextStrong}>Category</strong>: choose a word theme before the game starts.</>, ''],
            ].map(([text], i) => (
              <li key={i} className={styles.howItem}>
                <span className={styles.howNum} aria-hidden="true">{i + 1}</span>
                <span className={styles.howText}>{text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── BEST SCORES TAB ── */}
      {tab === 'scores' && (
        <div role="tabpanel" aria-label="Best scores">
          <div className={styles.scoreRows}>
            {localScores.length === 0 ? (
              <p className={styles.scoresEmpty}>No scores yet — play a round!</p>
            ) : (
              localScores.map((s, i) => (
                <div key={i} className={styles.scoreRow}>
                  <div>
                    <div className={styles.srLabel}>
                      {s.words} word{s.words !== 1 ? 's' : ''} · Level {s.level}
                      {s.maxCombo > 1 ? ` · ×${s.maxCombo} combo` : ''}
                    </div>
                    <div className={styles.srMeta}>
                      {s.date}{s.longestWord ? ` · Best word: ${s.longestWord}` : ''}
                    </div>
                  </div>
                  <div className={styles.srN}>{s.score}</div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ── GAME OVER OVERLAY ── */}
      {gameOver && (
        <div
          className={`${styles.overlay} ${styles.overlayShow}`}
          role="dialog"
          aria-modal="true"
          aria-label="Game over"
        >
          <div className={styles.modal}>
            {/* Icon */}
            <div className={styles.modalIcon} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
            </div>

            <h2 className={styles.modalTitle}>Game Over</h2>
            <p className={styles.modalSub}>{subMsg}</p>

            {/* Stats */}
            <div className={styles.modalStats} role="region" aria-label="Final stats">
              {[
                { n: state.score,       l: 'Score' },
                { n: state.wordsCorrect,l: 'Words' },
                { n: state.level,       l: 'Level' },
                { n: `×${state.maxCombo}`, l: 'Max Combo' },
                { n: state.clutchSaves, l: 'Clutch' },
              ].map(({ n, l }) => (
                <div key={l} className={styles.msBox}>
                  <div className={styles.msN}>{n}</div>
                  <div className={styles.msL}>{l}</div>
                </div>
              ))}
            </div>

            {/* Share */}
            <div className={styles.shareBox} aria-label="Share text" role="region">
              {shareText}
            </div>
            <button
              className={`${styles.btnPrimary} ${styles.btnShare}`}
              onClick={handleCopy}
              aria-label="Copy results to clipboard"
            >
              {copied ? '✓ Copied!' : 'Copy Results'}
            </button>
            {copied && <p className={styles.copiedMsg} aria-live="polite">✓ Copied!</p>}

            <button
              className={`${styles.btnPrimary} ${styles.btnRestart}`}
              onClick={handleStart}
              aria-label="Play again"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
