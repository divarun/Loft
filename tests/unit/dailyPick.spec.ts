import { test, expect } from '@playwright/test'
import { dailyIndex, DAILY_SALT } from '../../src/lib/dailyPick'
import { mulberry32 } from '../../src/lib/mulberry32'

const POOL = 250
const SALT = DAILY_SALT.atlasRush

test.describe('dailyIndex', () => {
  test('is deterministic for a given day', () => {
    for (const day of [0, 1, 47, 249, 250, 1000]) {
      expect(dailyIndex(day, POOL, SALT)).toBe(dailyIndex(day, POOL, SALT))
    }
  })

  test('stays in range', () => {
    for (let day = 0; day < 1200; day++) {
      const i = dailyIndex(day, POOL, SALT)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(POOL)
    }
  })

  test('uses every entry exactly once per cycle', () => {
    const seen = new Set<number>()
    for (let day = 0; day < POOL; day++) seen.add(dailyIndex(day, POOL, SALT))
    expect(seen.size).toBe(POOL)
  })

  test('reshuffles on the next cycle', () => {
    const first = Array.from({ length: POOL }, (_, d) => dailyIndex(d, POOL, SALT))
    const second = Array.from({ length: POOL }, (_, d) => dailyIndex(d + POOL, POOL, SALT))
    expect(second).not.toEqual(first)
    expect(new Set(second).size).toBe(POOL)
  })

  test('is not sequential — this is the whole point of the helper', () => {
    // The old `day % length` made tomorrow = today + 1. Confirm that's gone.
    let consecutive = 0
    for (let day = 0; day < 200; day++) {
      const a = dailyIndex(day, POOL, SALT)
      const b = dailyIndex(day + 1, POOL, SALT)
      if (b === (a + 1) % POOL) consecutive++
    }
    expect(consecutive).toBeLessThan(5)
  })

  test('different salts give different orderings', () => {
    const atlas = Array.from({ length: 40 }, (_, d) => dailyIndex(d, POOL, DAILY_SALT.atlasRush))
    const bridge = Array.from({ length: 40 }, (_, d) => dailyIndex(d, POOL, DAILY_SALT.ideaBridge))
    expect(atlas).not.toEqual(bridge)
  })

  test('handles degenerate pools without throwing', () => {
    expect(dailyIndex(5, 0, SALT)).toBe(0)
    expect(dailyIndex(5, 1, SALT)).toBe(0)
  })
})

test.describe('mulberry32', () => {
  // This PRNG seeds daily grids and saved layouts — a change silently
  // invalidates every player's stored progress.
  test('produces a stable known sequence', () => {
    const rand = mulberry32(12345)
    const got = [rand(), rand(), rand()].map(n => Number(n.toFixed(10)))
    expect(got).toEqual([0.9797282678, 0.3067522645, 0.4842054215])
  })

  test('same seed replays identically', () => {
    const a = mulberry32(999)
    const b = mulberry32(999)
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
  })

  test('stays within [0, 1)', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 5000; i++) {
      const n = rand()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })
})
