'use client'

import { useState, useEffect, useRef } from 'react'
import { getDayNumber } from '@/lib/dayNumber'
import { useIdeaBridge, type IdeaBridgeMode } from '@/hooks/useIdeaBridge'
import ChainViz from './ChainViz'
import BridgeInput from './BridgeInput'
import ResultCard from './ResultCard'
import styles from './IdeaBridgeGame.module.css'

type Tab = 'play' | 'howto' | 'history'

export default function IdeaBridgeGame() {
  const [activeTab, setActiveTab] = useState<Tab>('play')
  const [prevScore, setPrevScore] = useState(1000)
  const [scoreAnimate, setScoreAnimate] = useState(false)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const scoreRef = useRef(1000)

  const game = useIdeaBridge()

  const dayNumber = getDayNumber()

  // Animate score when it changes
  useEffect(() => {
    if (game.score !== prevScore) {
      setScoreAnimate(true)
      const t = setTimeout(() => setScoreAnimate(false), 250)
      setPrevScore(game.score)
      scoreRef.current = game.score
      return () => clearTimeout(t)
    }
  }, [game.score, prevScore])

  const scoreClass = () => {
    const s = game.score
    if (s >= 800) return styles.scoreHigh
    if (s >= 500) return styles.scoreMid
    if (s >= 200) return styles.scoreLow
    return styles.scoreCrit
  }

  const puzzle = game.puzzle
  const currentStep = puzzle?.steps[game.step]

  const handleModeChange = (m: IdeaBridgeMode) => {
    game.setMode(m)
  }

  // When switching to practice mode, allow difficulty re-fetch
  const handleDifficultyChange = (d: 'easy' | 'medium' | 'hard') => {
    setDifficulty(d)
    game.loadPuzzle()
  }

  return (
    <div className={styles.wrap}>
      {/* Mode selector */}
      <div className={styles.modeRow} role="group" aria-label="Game mode">
        {(['daily', 'practice', 'ai'] as const).map(m => (
          <button
            key={m}
            className={`${styles.modeBtn} ${game.mode === m ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange(m)}
            aria-pressed={game.mode === m}
          >
            {m === 'daily' ? 'Daily' : m === 'practice' ? 'Practice' : 'AI Generated'}
          </button>
        ))}
      </div>

      {/* Daily badge or difficulty selector */}
      {game.mode === 'daily' && (
        <div className={styles.dailyBadge} aria-label={`Daily puzzle #${dayNumber}`}>
          <span>Daily Puzzle</span>
          <span className={styles.dailyNum}>#{dayNumber}</span>
        </div>
      )}

      {game.mode === 'practice' && (
        <div className={styles.diffRow} role="group" aria-label="Difficulty">
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <button
              key={d}
              className={`${styles.diffBtn} ${
                difficulty === d
                  ? d === 'easy'
                    ? styles.diffBtnEasy
                    : d === 'medium'
                    ? styles.diffBtnMedium
                    : styles.diffBtnHard
                  : ''
              }`}
              onClick={() => handleDifficultyChange(d)}
              aria-pressed={difficulty === d}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Game sections">
        {(['play', 'howto', 'history'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'play' ? 'Play' : tab === 'howto' ? 'How to Play' : 'History'}
          </button>
        ))}
      </div>

      {/* ── PLAY TAB ── */}
      <div
        id="tabpanel-play"
        role="tabpanel"
        aria-labelledby="tab-play"
        hidden={activeTab !== 'play'}
      >
        {/* Daily done banner */}
        {game.mode === 'daily' && game.dailyDone && !game.done && (
          <div className={styles.dailyDoneBanner}>
            <p className={styles.dailyDoneTitle}>
              {game.dailyResult === 'won' ? '✓ Daily complete!' : 'Daily attempted'}
            </p>
            <p className={styles.dailyDoneHint}>Switch to Practice or AI mode to keep playing</p>
          </div>
        )}

        {/* Loading state */}
        {!puzzle && !game.validationError && (
          <div className={styles.loadingState} aria-live="polite" aria-label="Loading puzzle">
            <div className={styles.loadingSpinner} aria-hidden="true" />
            <span>Loading puzzle…</span>
          </div>
        )}

        {/* Error state */}
        {game.validationError && !puzzle && (
          <div className={styles.errorState}>
            <p className={styles.errorMsg}>{game.validationError}</p>
            <button className={styles.retryBtn} onClick={() => game.loadPuzzle()}>
              Try Again
            </button>
          </div>
        )}

        {/* Puzzle content */}
        {puzzle && (
          <>
            {/* Start → Target endpoints */}
            <div className={styles.endpoints}>
              <div className={styles.epCard}>
                <p className={styles.epLabel}>Start</p>
                <p className={styles.epWord}>{puzzle.start}</p>
              </div>
              <div className={styles.arrowConnector} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <div className={`${styles.epCard} ${styles.epCardTarget}`}>
                <p className={styles.epLabel}>Target</p>
                <p className={styles.epWord}>{puzzle.target}</p>
              </div>
            </div>

            {/* Score + step row */}
            <div className={styles.metaRow}>
              <div className={styles.scoreBlock}>
                <span
                  className={`${styles.scoreN} ${scoreClass()} ${scoreAnimate ? styles.scorePop : ''}`}
                  aria-label={`Score: ${game.score}`}
                >
                  {game.score}
                </span>
                <span className={styles.scoreLabel}>pts</span>
              </div>
              <div className={styles.metaRight}>
                <span className={styles.stepIndicator} aria-label={`Step ${game.step + 1} of ${puzzle.steps.length}`}>
                  Step {game.done ? puzzle.steps.length : game.step + 1} / {puzzle.steps.length}
                </span>
                <span
                  className={`${styles.diffBadge} ${
                    puzzle.difficulty === 'easy'
                      ? styles.diffEasy
                      : puzzle.difficulty === 'medium'
                      ? styles.diffMedium
                      : styles.diffHard
                  }`}
                >
                  {puzzle.difficulty}
                </span>
              </div>
            </div>

            {/* Chain visualization */}
            <ChainViz
              words={game.chain}
              totalSteps={puzzle.steps.length}
              done={game.done}
              won={game.done && game.score > 0}
            />

            {/* Game content: active play or result */}
            {!game.done ? (
              <>
                {/* Current word prompt */}
                <div className={styles.currentSection}>
                  <p className={styles.currentLabel}>Connect from</p>
                  <p className={styles.currentWord} aria-live="polite">
                    {game.chain[game.chain.length - 1]}
                  </p>
                  <p className={styles.currentToward}>
                    toward <strong>{puzzle.target}</strong>
                  </p>
                </div>

                {/* Free-form input */}
                <BridgeInput
                  onSubmit={game.submitWord}
                  validating={game.validating}
                  disabled={game.done}
                  hint={game.hint}
                  wrongFeedback={game.wrongFeedback}
                  explanation={game.stepExplain}
                />

                {/* Hint + Skip row */}
                <div className={styles.actionsRow}>
                  <button
                    className={styles.hintBtn}
                    onClick={game.useHint}
                    disabled={game.hintUsed || game.done || game.validating}
                    aria-label={`Use hint — costs 200 points${game.hintUsed ? ' (already used)' : ''}`}
                  >
                    <span aria-hidden="true">💡</span>
                    Hint
                    <span className={styles.hintCost}>−200pts</span>
                  </button>
                  <button
                    className={styles.skipBtn}
                    onClick={game.skipPuzzle}
                    aria-label="Skip this puzzle"
                  >
                    Skip
                  </button>
                </div>
              </>
            ) : (
              <ResultCard
                puzzle={puzzle}
                chain={game.chain}
                score={game.score}
                totalWrong={game.totalWrong}
                won={game.score > 0}
                shareText={game.shareText}
                onCopyShare={game.copyShare}
                onNextPuzzle={game.nextPuzzle}
                mode={game.mode}
              />
            )}
          </>
        )}
      </div>

      {/* ── HOW TO PLAY TAB ── */}
      <div
        id="tabpanel-howto"
        role="tabpanel"
        aria-labelledby="tab-howto"
        hidden={activeTab !== 'howto'}
      >
        <ol className={styles.howList} aria-label="How to play instructions">
          <li className={styles.howItem}>
            <span className={styles.howNum} aria-hidden="true">1</span>
            <p className={styles.howBody}>
              <strong>You'll see a Start word and a Target word.</strong> Your goal is to
              connect them through a chain of logical associations.
            </p>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum} aria-hidden="true">2</span>
            <p className={styles.howBody}>
              <strong>Type any word</strong> that logically connects the current word to the target.
              You're not limited to a set list — <em>any reasonable bridge counts!</em>
            </p>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum} aria-hidden="true">3</span>
            <p className={styles.howBody}>
              <strong>Claude AI validates your answer.</strong> Synonyms and semantically close
              words are accepted — it's about the concept, not the exact spelling.
            </p>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum} aria-hidden="true">4</span>
            <p className={styles.howBody}>
              You start with <em>1000 points</em>. Each wrong answer costs <em>−100 pts</em>.
              Using the hint costs <em>−200 pts</em>. Reach 0 and the puzzle ends.
            </p>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum} aria-hidden="true">5</span>
            <p className={styles.howBody}>
              <strong>Daily puzzles</strong> are the same for everyone each day and count
              toward your streak. <strong>Practice</strong> and <strong>AI Generated</strong> modes
              let you play as many puzzles as you want.
            </p>
          </li>
          <li className={styles.howItem}>
            <span className={styles.howNum} aria-hidden="true">6</span>
            <p className={styles.howBody}>
              After completing a puzzle, <strong>share your result</strong> with the chain
              and score. Keep your daily streak going — consecutive days earn 🔥!
            </p>
          </li>
        </ol>
      </div>

      {/* ── HISTORY TAB ── */}
      <div
        id="tabpanel-history"
        role="tabpanel"
        aria-labelledby="tab-history"
        hidden={activeTab !== 'history'}
      >
        {game.history.length === 0 ? (
          <p className={styles.historyEmpty}>No completed puzzles yet. Play one to see your history!</p>
        ) : (
          <ol className={styles.historyList} aria-label="Puzzle history">
            {game.history.map((rec, i) => (
              <li key={`${rec.id}-${i}`} className={styles.histRow}>
                <div className={styles.histLeft}>
                  <span className={styles.histPair}>
                    {rec.start}
                    <span className={styles.histSep} aria-hidden="true">→</span>
                    {rec.target}
                  </span>
                  <span className={styles.histMeta}>
                    {rec.hops} hop{rec.hops !== 1 ? 's' : ''} · {rec.wrong} miss{rec.wrong !== 1 ? 'es' : ''} ·{' '}
                    {rec.date} · {rec.mode}
                  </span>
                </div>
                <div className={styles.histRight}>
                  <span className={styles.histScore}>{rec.score}</span>
                  <span className={`${styles.histResult} ${rec.won ? styles.histWon : styles.histLost}`}>
                    {rec.won ? 'Won' : 'Lost'}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
