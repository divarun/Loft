export function buildAltNamesMap(countries: Array<{ name: string; alts?: string[] }>): Map<string, string> {
  const map = new Map<string, string>()
  for (const c of countries) {
    if (Array.isArray(c.alts)) {
      for (const alt of c.alts) {
        map.set(alt.toLowerCase().trim(), c.name.toLowerCase())
      }
    }
  }
  return map
}

export function normalizeGuess(raw: string, altNames: Map<string, string>): string {
  const s = raw.toLowerCase().trim().replace(/\s+/g, ' ')
  return altNames.get(s) ?? s
}
