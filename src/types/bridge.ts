export interface PuzzleStep {
  correct: string
  options: string[]
  explain: string
}

/**
 * The full puzzle including answers. SERVER ONLY — never serialise this to the
 * client, or every answer shows up in the network tab. Use `Puzzle` instead.
 */
export interface FullPuzzle {
  id: number | string
  difficulty: 'easy' | 'medium' | 'hard'
  start: string
  target: string
  steps: PuzzleStep[]
  fact: string
  source: 'curated' | 'ai'
}

/** The answer-free shape sent to the browser. */
export interface Puzzle {
  id: number | string
  difficulty: 'easy' | 'medium' | 'hard'
  start: string
  target: string
  stepCount: number
  source: 'curated' | 'ai'
}

/** Revealed only once the puzzle is over (won, lost, or skipped). */
export interface Solution {
  chain: string[]
  fact: string
}

export interface BridgeState {
  puzzle: Puzzle | null
  step: number
  chain: string[]
  score: number
  totalWrong: number
  streak: number
  done: boolean
  mode: 'daily' | 'practice' | 'ai'
  hintUsed: boolean
  validating: boolean
}

export interface HistoryRecord {
  id: number | string
  start: string
  target: string
  chain: string[]
  score: number
  hops: number
  wrong: number
  won: boolean
  date: string
  mode: string
}
