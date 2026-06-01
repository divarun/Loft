// words.json tuple: [scrambled, answer, hint, definition]
export type WordEntry = [string, string, string, string]
export type WordTier = 'easy' | 'medium' | 'hard' | 'expert'
export type WordBank = Record<WordTier, WordEntry[]>

export type Category = 'all' | 'animals' | 'geography' | 'science' | 'food'
export type PowerUpType = 'slow' | 'freeze' | 'reveal'

export interface PowerUp {
  type: PowerUpType
  available: boolean
  cooldownUntil: number  // performance.now() timestamp; 0 = ready
}

export interface Tile {
  id: string
  el: HTMLDivElement
  answer: string
  def: string
  dur: number          // fall duration ms (modified by Slow power-up)
  startTime: number    // performance.now()
  removed: boolean
  landed: boolean
  x: number
}

export interface LetterDropStats {
  score: number
  wordsCorrect: number
  level: number
  lives: number
  combo: number
  maxCombo: number
  longestWord: string
  clutchSaves: number
  running: boolean
  paused: boolean
  powerUps: PowerUp[]
  category: Category
}
