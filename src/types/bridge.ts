export interface PuzzleStep {
  correct: string
  options: string[]
  explain: string
}

export interface Puzzle {
  id: number | string
  difficulty: 'easy' | 'medium' | 'hard'
  start: string
  target: string
  steps: PuzzleStep[]
  fact: string
  source: 'curated' | 'ai'
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
