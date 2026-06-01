import { kv } from '@vercel/kv'

export interface LeaderboardEntry {
  name: string
  score: number
  rank: number
}

export interface DailyStats {
  totalPlays: number
  totalWins: number
  avgScore: number
  clueDistribution: Record<string, number>
}

export async function submitLeaderboardScore(
  game: string,
  name: string,
  score: number
): Promise<number> {
  await kv.zadd(`${game}:lb`, { score, member: name })
  const rank = await kv.zrevrank(`${game}:lb`, name)
  return (rank ?? 0) + 1
}

export async function getLeaderboard(game: string, limit = 10): Promise<LeaderboardEntry[]> {
  const results = await kv.zrange(`${game}:lb`, 0, limit - 1, { rev: true, withScores: true })
  const entries: LeaderboardEntry[] = []
  for (let i = 0; i < results.length; i += 2) {
    entries.push({ name: results[i] as string, score: results[i + 1] as number, rank: i / 2 + 1 })
  }
  return entries
}

export async function recordDailyResult(
  dayNumber: number,
  won: boolean,
  score: number,
  clues: number
): Promise<void> {
  const key = `atlas:day:${dayNumber}`
  await kv.hincrby(key, 'plays', 1)
  if (won) await kv.hincrby(key, 'wins', 1)
  await kv.hincrby(key, 'totalScore', score)
  await kv.hincrby(key, `clues:${clues}`, 1)
  await kv.expire(key, 60 * 60 * 24 * 7) // 7 days TTL
}

export async function getDailyStats(dayNumber: number): Promise<DailyStats | null> {
  const data = await kv.hgetall(`atlas:day:${dayNumber}`)
  if (!data) return null
  const plays = Number(data.plays ?? 0)
  const wins = Number(data.wins ?? 0)
  const totalScore = Number(data.totalScore ?? 0)
  const dist: Record<string, number> = {}
  for (let i = 1; i <= 7; i++) {
    dist[String(i)] = Number(data[`clues:${i}`] ?? 0)
  }
  return {
    totalPlays: plays,
    totalWins: wins,
    avgScore: plays > 0 ? Math.round(totalScore / plays) : 0,
    clueDistribution: dist,
  }
}
