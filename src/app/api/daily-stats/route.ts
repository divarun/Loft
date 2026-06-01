import { NextRequest, NextResponse } from 'next/server'
import { getDayNumber } from '@/lib/dayNumber'
import { recordDailyResult, getDailyStats } from '@/lib/kv'

export async function GET() {
  const stats = await getDailyStats(getDayNumber())
  return NextResponse.json(stats ?? { totalPlays: 0, totalWins: 0, avgScore: 0, clueDistribution: {} })
}

export async function POST(req: NextRequest) {
  const { won, score, clues } = await req.json()
  await recordDailyResult(getDayNumber(), Boolean(won), Number(score), Number(clues))
  return NextResponse.json({ ok: true })
}
