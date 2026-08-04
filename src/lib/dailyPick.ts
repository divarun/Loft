import { mulberry32 } from '@/lib/mulberry32'

/**
 * Pick today's index into a fixed-length pool.
 *
 * A plain `day % length` is sequential: once you know today's answer you know
 * every future one by counting forward. Instead we deal the pool into a shuffled
 * cycle and walk that. Two properties fall out of it:
 *
 *   - no repeat until the whole pool has been used (same as modulo)
 *   - consecutive days are unrelated, so tomorrow can't be read off today
 *
 * The shuffle is seeded per cycle, so a given day always resolves to the same
 * entry. `salt` keeps different games from marching in lockstep through their
 * pools.
 *
 * Note this is obfuscation, not secrecy — the algorithm is in a public repo.
 * It stops incidental spoilers, not someone who reads the source.
 */
export function dailyIndex(day: number, length: number, salt: number): number {
  if (length <= 0) return 0

  const cycle = Math.floor(day / length)
  const offset = ((day % length) + length) % length

  const rand = mulberry32((cycle + 1) * 0x9e3779b1 + salt)
  const order = Array.from({ length }, (_, i) => i)

  // Fisher-Yates — an unbiased shuffle, unlike `sort(() => rand() - 0.5)`.
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  return order[offset]
}

/** Distinct salts so AtlasRush and IdeaBridge cycle independently. */
export const DAILY_SALT = {
  atlasRush: 0x41_54_4c_53,
  ideaBridge: 0x42_52_44_47,
} as const
