/** Days since 2025-01-01 UTC */
export function getDayNumber(): number {
  const epoch = Date.UTC(2025, 0, 1)
  const now = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  )
  return Math.floor((now - epoch) / 86_400_000)
}
