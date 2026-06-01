const R = 6371 // Earth radius km

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

export function distanceFeedback(km: number): string {
  if (km < 500)  return `🔥 Very close — ~${km.toLocaleString()} km away`
  if (km < 2000) return `🌡️ Warm — ~${km.toLocaleString()} km away`
  if (km < 5000) return `🌊 Cold — ~${km.toLocaleString()} km away`
  return `🧊 Freezing — ~${km.toLocaleString()} km away`
}
