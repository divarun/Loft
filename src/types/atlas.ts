export interface Country {
  name: string
  code: string        // ISO 3166-1 alpha-2 lowercase
  flag: string
  continent: string
  pop: string
  borders: string
  capital: string
  landmark: string
  hint: string
  difficulty: 'easy' | 'medium' | 'hard'
  alts: string[]
  fact: string
  lat?: number        // injected from centroids at runtime
  lon?: number
}

export type ClueKey = 'continent' | 'pop' | 'borders' | 'capital' | 'shape' | 'flag' | 'hint'
export type ClueState = 'locked' | 'revealed' | 'correct' | 'lost'
export type GameMode = 'daily' | 'practice'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type InputMode = 'type' | 'map'

export interface AtlasRoundState {
  current: Country | null
  revealed: number
  score: number
  wrongGuesses: number
  streak: number
  roundOver: boolean
  clueStates: ClueState[]
  mode: GameMode
  difficulty: Difficulty
  inputMode: InputMode
  distanceFeedback: string | null
}

export interface BestScore {
  country: string
  flag: string
  score: number
  clues: number
  difficulty: string
  won: boolean
  date: string
}
