import { test, expect } from '@playwright/test'
import { haversineKm, bearingDeg, distanceFeedback } from '../../src/lib/haversine'
import { buildAltNamesMap, normalizeGuess } from '../../src/lib/normalizeGuess'
import countries from '../../src/data/countries.json'
import { getNumericId } from '../../src/lib/a2ToNum'

test.describe('haversine', () => {
  test('zero distance for the same point', () => {
    expect(haversineKm(48.85, 2.35, 48.85, 2.35)).toBe(0)
  })

  test('London to Paris is about 340 km', () => {
    const km = haversineKm(51.5074, -0.1278, 48.8566, 2.3522)
    expect(km).toBeGreaterThan(320)
    expect(km).toBeLessThan(360)
  })

  test('is symmetric', () => {
    const a = haversineKm(35.68, 139.69, -33.87, 151.21)
    const b = haversineKm(-33.87, 151.21, 35.68, 139.69)
    expect(a).toBe(b)
  })

  test('antipodal points are about half the circumference', () => {
    const km = haversineKm(0, 0, 0, 180)
    expect(km).toBeGreaterThan(19_000)
    expect(km).toBeLessThan(20_100)
  })
})

test.describe('bearingDeg', () => {
  test('due north is 0', () => {
    expect(Math.round(bearingDeg(0, 0, 10, 0))).toBe(0)
  })

  test('due east is 90', () => {
    expect(Math.round(bearingDeg(0, 0, 0, 10))).toBe(90)
  })

  test('due south is 180', () => {
    expect(Math.round(bearingDeg(10, 0, 0, 0))).toBe(180)
  })

  test('always returns 0..360', () => {
    for (let i = 0; i < 360; i += 7) {
      const b = bearingDeg(0, 0, Math.sin(i), Math.cos(i))
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(360)
    }
  })
})

test.describe('distanceFeedback', () => {
  test('scales the wording with distance', () => {
    expect(distanceFeedback(100)).toContain('Very close')
    expect(distanceFeedback(1500)).toContain('Warm')
    expect(distanceFeedback(3000)).toContain('Cold')
    expect(distanceFeedback(9000)).toContain('Freezing')
  })

  test('appends a bearing arrow when given one', () => {
    expect(distanceFeedback(100, 0)).toContain('↑')
    expect(distanceFeedback(100, 90)).toContain('→')
    expect(distanceFeedback(100, 180)).toContain('↓')
    expect(distanceFeedback(100, 270)).toContain('←')
  })

  test('wraps 360 back to north rather than falling off the array', () => {
    expect(distanceFeedback(100, 360)).toContain('↑')
  })

  test('omits the arrow when no bearing is given', () => {
    expect(distanceFeedback(100)).not.toMatch(/[↑↗→↘↓↙←↖]/)
  })
})

test.describe('normalizeGuess', () => {
  const alts = buildAltNamesMap([
    { name: 'United States', alts: ['USA', 'US', 'America'] },
    { name: 'Netherlands', alts: ['Holland'] },
  ])

  test('resolves alternate names to the canonical name', () => {
    expect(normalizeGuess('USA', alts)).toBe('united states')
    expect(normalizeGuess('Holland', alts)).toBe('netherlands')
  })

  test('is case and whitespace insensitive', () => {
    expect(normalizeGuess('  aMeRiCa  ', alts)).toBe('united states')
    expect(normalizeGuess('United   States', alts)).toBe('united states')
  })

  test('passes unknown guesses through lowercased', () => {
    expect(normalizeGuess('Narnia', alts)).toBe('narnia')
  })
})

test.describe('countries.json integrity', () => {
  const list = countries as Array<Record<string, unknown>>

  test('every entry has the fields the game reads', () => {
    for (const c of list) {
      expect(typeof c.name, `name on ${JSON.stringify(c.code)}`).toBe('string')
      expect(typeof c.code, `code on ${String(c.name)}`).toBe('string')
      expect(['easy', 'medium', 'hard']).toContain(c.difficulty)
    }
  })

  test('country codes are unique — daily seeding indexes by position', () => {
    const codes = list.map(c => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('most countries map to a TopoJSON id for the shape clue', () => {
    const mapped = list.filter(c => getNumericId(c.code as string) != null)
    // Missing entries silently degrade to "shape unavailable", so track the rate
    expect(mapped.length / list.length).toBeGreaterThan(0.85)
  })
})
