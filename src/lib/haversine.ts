const R = 6371 // Earth radius km

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function distanceFeedback(km: number, bearing?: number): string {
  const dirs = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
  const arrow = bearing !== undefined ? ` ${dirs[Math.round(bearing / 45) % 8]}` : ''
  if (km < 500)  return `🔥 Very close — ~${km.toLocaleString()} km away${arrow}`
  if (km < 2000) return `🌡️ Warm — ~${km.toLocaleString()} km away${arrow}`
  if (km < 5000) return `🌊 Cold — ~${km.toLocaleString()} km away${arrow}`
  return `🧊 Freezing — ~${km.toLocaleString()} km away${arrow}`
}
