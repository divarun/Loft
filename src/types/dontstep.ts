export type DontStepDifficulty = 'easy' | 'medium' | 'hard'

export interface MemoryEntry { x: number; y: number }

export interface DontStepUIState {
  running: boolean
  score: number
  lives: number
  trapCount: number
  previewPhase: boolean
  gridSize: number
  best: number
  memorySize: number
}
