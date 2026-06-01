'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAtlasRush } from '@/hooks/useAtlasRush'
import type { ClueKey, ClueState, GameMode, Difficulty, InputMode, BestScore } from '@/types/atlas'
import GuessInput from './GuessInput'
import ResultCard from './ResultCard'
import ShapeCanvas from './ShapeCanvas'
import WorldMap from './WorldMap'
import styles from './AtlasRushGame.module.css'

// ─── Clue metadata ───────────────────────────────────────────────────────────
const CLUE_META: Record<ClueKey, { icon: string; label: string; typeClass: string }> = {
  continent: { icon: '🌍', label: 'Continent',  typeClass: '' },
  pop:       { icon: '👥', label: 'Population', typeClass: styles.clueTypePop },
  borders:   { icon: '🗺️', label: 'Borders',    typeClass: styles.clueTypeBorders },
  capital:   { icon: '🏛️', label: 'Capital',    typeClass: styles.clueTypeCapital },
  shape:     { icon: '📐', label: 'Shape',      typeClass: styles.clueTypeShape },
  flag:      { icon: '🏴', label: 'Flag',       typeClass: styles.clueTypeFlag },
  hint:      { icon: '💡', label: 'Hint',       typeClass: styles.clueTypeHint },
}

type TabId = 'play' | 'how' | 'scores'

// ─── Score class helper ───────────────────────────────────────────────────────
function scoreClass(score: number): string {
  if (score >= 850) return styles.scoreHigh
  if (score >= 600) return styles.scoreMid
  if (score >= 300) return styles.scoreLow
  return styles.scoreCritical
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AtlasRushGame() {
  const {
    state,
    worldFeaturesRef,
    revealNextClue,
    submitGuess,
    skipCountry,
    nextRound,
    setMode,
    setDifficulty,
    setInputMode,
    updateSuggestions,
    copyShare,
    CLUE_KEYS,
    CLUE_COST,
    WRONG_COST,
  } = useAtlasRush()

  const [activeTab, setActiveTab] = useState<TabId>('play')
  const [copied, setCopied] = useState(false)
  const [wrongCodes, setWrongCodes] = useState<string[]>([])

  // Score delta animation
  const prevScoreRef = useRef<number | null>(null)
  const deltaIdRef = useRef(0)
  const [deltas, setDeltas] = useState<Array<{ id: number; value: number }>>([])

  useEffect(() => {
    const score = state.score
    if (prevScoreRef.current !== null && score < prevScoreRef.current) {
      const delta = score - prevScoreRef.current
      const id = ++deltaIdRef.current
      setDeltas(d => [...d, { id, value: delta }])
      setTimeout(() => setDeltas(d => d.filter(x => x.id !== id)), 900)
    }
    prevScoreRef.current = score
  }, [state.score])

  // Confetti on win
  const [showConfetti, setShowConfetti] = useState(false)
  const prevRoundOverRef = useRef(false)

  useEffect(() => {
    const roundOver = state.roundOver
    const won = state.clueStates.some(s => s === 'correct')
    if (roundOver && won && !prevRoundOverRef.current) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2500)
    }
    prevRoundOverRef.current = roundOver
  }, [state.roundOver, state.clueStates])

  const handleCopyShare = useCallback(() => {
    copyShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [copyShare])

  const handleGuessSubmit = useCallback(
    (val: string) => {
      // Track guessed wrong codes for map mode
      const country = state.countries.find(
        (c) => c.name.toLowerCase() === val.toLowerCase()
      )
      const before = state.roundOver
      submitGuess(val)
      // After submit, if the guess was wrong, track it
      if (country && !before && state.current && country.name !== state.current.name) {
        setWrongCodes((prev) => [...prev, country.code])
      }
    },
    [submitGuess, state.countries, state.roundOver, state.current]
  )

  // Reset wrong codes on new round
  const handleNextRound = useCallback(() => {
    setWrongCodes([])
    nextRound()
  }, [nextRound])

  const {
    current,
    revealed,
    score,
    streak,
    roundOver,
    clueStates,
    mode,
    difficulty,
    inputMode,
    distanceFeedback,
    suggestions,
    feedback,
    bestScores,
    shareText,
    dailyDone,
    dailyResult,
    dayNumber,
    countries,
  } = state

  // ─── Clue rendering ────────────────────────────────────────────────────────
  function renderClueValue(key: ClueKey): React.ReactNode {
    if (!current) return null
    switch (key) {
      case 'continent': return current.continent
      case 'pop':       return current.pop
      case 'borders':   return current.borders || 'None'
      case 'capital':   return current.capital
      case 'shape':
        return (
          <ShapeCanvas
            countryCode={current.code}
            worldFeatures={worldFeaturesRef.current}
          />
        )
      case 'flag':
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://flagcdn.com/w160/${current.code}.webp`}
            alt={`Flag of mystery country`}
            className={styles.clueFlagImg}
            width={72}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )
      case 'hint': return current.hint
      default:     return null
    }
  }

  // Revealed clue cards (indices 0..revealed-1)
  const revealedKeys = CLUE_KEYS.slice(0, revealed) as ClueKey[]
  // Locked clue keys
  const lockedKeys = CLUE_KEYS.slice(revealed) as ClueKey[]

  const canReveal = !roundOver && revealed < CLUE_KEYS.length

  const correctCode = roundOver && current ? current.code : undefined

  // ─── Streak pill ────────────────────────────────────────────────────────────
  const streakPill = (
    <div
      className={`${styles.streakPill}${streak > 0 ? ` ${styles.streakPillHot}` : ''}`}
      aria-label={streak > 0 ? `Current streak: ${streak}` : 'No streak yet'}
    >
      {streak > 0 ? '🔥' : '⚡'} Streak: {streak}
    </div>
  )

  // ─── Nav ────────────────────────────────────────────────────────────────────
  const nav = (
    <header style={{ width: '100%', maxWidth: 580, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 0 1.1rem', borderBottom: '1px solid var(--border)' }}>
        <div>
          <Link
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase', minHeight: 44 }}
            aria-label="Back to All Games"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            All Games
          </Link>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem, 6vw, 2rem)', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1 }}>
            Atlas<em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Rush</em>
          </div>
        </div>
        {streakPill}
      </div>
    </header>
  )

  // ─── Tabs ────────────────────────────────────────────────────────────────────
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'play',   label: 'Play' },
    { id: 'how',    label: 'How to Play' },
    { id: 'scores', label: 'Best Scores' },
  ]

  // ─── How to play ─────────────────────────────────────────────────────────────
  const howToPlay = (
    <ol className={styles.howList} aria-label="How to play AtlasRush">
      {[
        { n: 1, html: <><strong>One clue is revealed at a time</strong> — starting with continent, then population, borders, capital, shape, flag, and a text hint.</> },
        { n: 2, html: <><strong>Guess the country</strong> using the text input or click a country on the world map.</> },
        { n: 3, html: <>You start with <strong>1000 points</strong>. Each revealed clue costs <strong>−{CLUE_COST} pts</strong>; each wrong guess costs <strong>−{WRONG_COST} pts</strong>.</> },
        { n: 4, html: <><strong>Wrong guesses</strong> show how far away that country is from the answer.</> },
        { n: 5, html: <><strong>Daily mode</strong> gives everyone the same country each day. Your streak grows with consecutive wins.</> },
        { n: 6, html: <>Share your result with the emoji grid after each round!</> },
      ].map(({ n, html }) => (
        <li key={n} className={styles.howItem}>
          <span className={styles.howNum} aria-hidden="true">{n}</span>
          <p className={styles.howText}>{html}</p>
        </li>
      ))}
    </ol>
  )

  // ─── Best scores ─────────────────────────────────────────────────────────────
  function diffBadgeClass(d: string): string {
    if (d === 'daily')  return styles.diffBadgeDaily
    if (d === 'easy')   return styles.diffBadgeEasy
    if (d === 'medium') return styles.diffBadgeMedium
    return styles.diffBadgeHard
  }

  const scoresTab = (
    <div className={styles.scoresList} aria-label="Best scores">
      {bestScores.length === 0 ? (
        <p className={styles.scoresEmpty}>No scores yet — play a round!</p>
      ) : (
        (bestScores as BestScore[]).map((entry, i) => (
          <div key={i} className={`${styles.scoreRow}${!entry.won ? ` ${styles.scoreRowLoss}` : ''}`} role="listitem">
            <div className={styles.scoreRowLeft}>
              <span className={styles.scoreRowFlag} aria-hidden="true">{entry.flag}</span>
              <div className={styles.scoreRowInfo}>
                <div className={styles.scoreRowName}>
                  {entry.country}
                  {entry.won && <span style={{ fontSize: '0.8rem' }}>✅</span>}
                </div>
                <div className={styles.scoreRowClues}>{entry.clues} clue{entry.clues !== 1 ? 's' : ''} · {entry.date}</div>
              </div>
            </div>
            <div className={styles.scoreRowRight}>
              <span className={`${styles.scoreRowScore}${!entry.won ? ` ${styles.scoreRowScoreLoss}` : ''}`}>
                {entry.won ? entry.score : '—'}
              </span>
              <span className={`${styles.diffBadge} ${diffBadgeClass(entry.difficulty)}`}>
                {entry.difficulty}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )

  // ─── Play tab ─────────────────────────────────────────────────────────────────
  function renderPlayTab() {
    if (!current) {
      return (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }} aria-live="polite">
          Loading…
        </p>
      )
    }

    // Daily done banner
    if (mode === 'daily' && dailyDone && !roundOver) {
      return (
        <div className={styles.dailyDoneBanner} aria-live="polite">
          <span className={styles.dailyDoneTitle}>
            {dailyResult === 'won' ? '✅ You already played today!' : '❌ You already played today.'}
          </span>
          <span className={styles.dailyDoneHint}>Come back tomorrow for a new country.</span>
        </div>
      )
    }

    // Score class
    const sClass = scoreClass(score)

    // Progress dots
    const dots = CLUE_KEYS.map((_, i) => {
      const st: ClueState = clueStates[i]
      let cls = styles.dot
      if (st === 'correct') cls += ` ${styles.dotWin}`
      else if (st === 'lost') cls += ` ${styles.dotUsed}`
      else if (st === 'revealed' && i === revealed - 1 && !roundOver) cls += ` ${styles.dotActive}`
      else if (st === 'revealed') cls += ` ${styles.dotUsed}`
      return <span key={i} className={cls} aria-hidden="true" />
    })

    return (
      <>
        {/* Score bar */}
        <div className={styles.scoreBar} aria-label={`Current score: ${score}`}>
          <div className={styles.scoreLeft}>
            <div className={styles.scoreLabel}>Score</div>
            <div className={styles.scoreDeltaWrap}>
              <div key={score} className={`${styles.scoreVal} ${sClass}`} aria-live="polite" aria-atomic="true">
                {score}
              </div>
              {deltas.map(d => (
                <span key={d.id} className={styles.scoreDelta} aria-hidden="true">{d.value}</span>
              ))}
            </div>
          </div>
          <div className={styles.clueCounter}>
            <strong>{revealed}</strong> / {CLUE_KEYS.length} clues
          </div>
        </div>

        {/* Progress dots */}
        <div className={styles.progressRow} role="group" aria-label="Clue progress">
          {dots}
        </div>

        {/* Revealed clue cards */}
        <div className={styles.cluesStack} aria-label="Revealed clues" aria-live="polite">
          {revealedKeys.map((key, i) => {
            const meta = CLUE_META[key]
            const isFirst = i === 0
            return (
              <div
                key={key}
                className={`${styles.clueCard} ${meta.typeClass}${isFirst ? ` ${styles.clueCardFirst}` : ''}`}
              >
                <div className={styles.clueIcon} aria-hidden="true">{meta.icon}</div>
                <div className={styles.clueContent}>
                  <div className={styles.clueLabel}>{meta.label}</div>
                  <div className={styles.clueValue}>{renderClueValue(key)}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Locked clue pills */}
        {!roundOver && lockedKeys.length > 0 && (
          <div className={styles.lockedRow} aria-label="Locked clues">
            {lockedKeys.map((key) => (
              <span key={key} className={styles.lockedPill} aria-label={`${CLUE_META[key].label} — locked`}>
                🔒 {CLUE_META[key].label}
              </span>
            ))}
          </div>
        )}

        {/* Input area — only when not round over */}
        {!roundOver && (
          <>
            {/* Input mode toggle */}
            <div className={styles.inputModeRow} role="group" aria-label="Input mode">
              {(['type', 'map'] as InputMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.inputModeBtn}${inputMode === m ? ` ${styles.inputModeBtnActive}` : ''}`}
                  onClick={() => setInputMode(m)}
                  aria-pressed={inputMode === m}
                >
                  {m === 'type' ? '⌨️ Type' : '🗺️ Map'}
                </button>
              ))}
            </div>

            {/* Type mode */}
            {inputMode === 'type' && (
              <GuessInput
                suggestions={suggestions}
                onInput={updateSuggestions}
                onSubmit={handleGuessSubmit}
                onSelect={handleGuessSubmit}
                disabled={roundOver}
                feedback={feedback}
                distanceFeedback={distanceFeedback}
              />
            )}

            {/* Map mode */}
            {inputMode === 'map' && (
              <>
                {distanceFeedback && (
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-soft)', fontStyle: 'italic', marginBottom: '0.5rem' }} aria-live="polite">
                    {distanceFeedback}
                  </p>
                )}
                {feedback && (
                  <p style={{ fontSize: '0.83rem', color: 'var(--danger)', marginBottom: '0.5rem' }} role="alert" aria-live="assertive">
                    {feedback}
                  </p>
                )}
                <WorldMap
                  onGuess={handleGuessSubmit}
                  guessedCountries={wrongCodes}
                  correctCode={correctCode}
                  allCountries={countries}
                />
              </>
            )}

            {/* Hint / skip / reveal row */}
            <div className={styles.hintRow}>
              {canReveal && (
                <button
                  type="button"
                  className={`${styles.btnGhost} ${styles.btnReveal}`}
                  onClick={revealNextClue}
                  aria-label={`Reveal next clue — costs ${CLUE_COST} points`}
                >
                  Reveal clue
                  <span className={styles.costBadge} aria-hidden="true"> −{CLUE_COST}</span>
                </button>
              )}
              {!canReveal && (
                <span className={styles.hintLabel}>All clues revealed</span>
              )}
              <button
                type="button"
                className={`${styles.btnGhost} ${styles.btnSkip}`}
                onClick={skipCountry}
                aria-label="Skip this country — lose the round"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {/* Result card */}
        {roundOver && current && (
          <ResultCard
            country={current}
            won={clueStates.some((s) => s === 'correct')}
            score={score}
            cluesUsed={revealed}
            streak={streak}
            shareText={shareText}
            onNext={mode === 'practice' ? handleNextRound : undefined}
            onCopyShare={handleCopyShare}
          />
        )}

        {copied && (
          <p
            className={styles.srOnly}
            role="status"
            aria-live="polite"
          >
            Copied to clipboard!
          </p>
        )}
      </>
    )
  }

  return (
    <>
    {showConfetti && (
      <div className={styles.confettiWrap} aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className={styles.confettiPiece} />
        ))}
      </div>
    )}
    <div className={styles.gameWrap}>
      <span className={styles.srOnly} id="main-skip-target" tabIndex={-1} />

      {nav}

      <div style={{ marginTop: '1.25rem' }}>
        {/* Mode toggle */}
        <div className={styles.modeRow} role="group" aria-label="Game mode">
          {(['daily', 'practice'] as GameMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn}${mode === m ? ` ${styles.modeBtnActive}` : ''}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {m === 'daily' ? '📅 Daily' : '🎲 Practice'}
            </button>
          ))}
        </div>

        {/* Daily badge OR difficulty */}
        {mode === 'daily' ? (
          <div className={styles.dailyBadge} aria-label={`Daily challenge number ${dayNumber}`}>
            📅 Daily Challenge
            <span className={styles.dailyNum}>#{dayNumber}</span>
          </div>
        ) : (
          <div className={styles.diffRow} role="group" aria-label="Difficulty">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
              let activeClass = ''
              if (difficulty === d) {
                if (d === 'easy')   activeClass = ` ${styles.diffBtnEasy}`
                if (d === 'medium') activeClass = ` ${styles.diffBtnMedium}`
                if (d === 'hard')   activeClass = ` ${styles.diffBtnHard}`
              }
              return (
                <button
                  key={d}
                  type="button"
                  className={`${styles.diffBtn}${activeClass}`}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  data-diff={d}
                >
                  {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
                </button>
              )
            })}
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Game sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className={`${styles.tabBtn}${activeTab === t.id ? ` ${styles.tabBtnActive}` : ''}`}
              onClick={() => setActiveTab(t.id)}
              aria-selected={activeTab === t.id}
              aria-controls={`tabpanel-${t.id}`}
              id={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div
          id="tabpanel-play"
          role="tabpanel"
          aria-labelledby="tab-play"
          hidden={activeTab !== 'play'}
        >
          {activeTab === 'play' && renderPlayTab()}
        </div>

        <div
          id="tabpanel-how"
          role="tabpanel"
          aria-labelledby="tab-how"
          hidden={activeTab !== 'how'}
        >
          {activeTab === 'how' && howToPlay}
        </div>

        <div
          id="tabpanel-scores"
          role="tabpanel"
          aria-labelledby="tab-scores"
          hidden={activeTab !== 'scores'}
        >
          {activeTab === 'scores' && scoresTab}
        </div>
      </div>
    </div>
    </>
  )
}
