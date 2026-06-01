import { NextRequest, NextResponse } from 'next/server'
import { submitLeaderboardScore, getLeaderboard } from '@/lib/kv'

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get('game') ?? 'letter-drop'
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '10')
  const entries = await getLeaderboard(game, Math.min(limit, 50))
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const { game, name, score } = await req.json()
  if (!game || !name || typeof score !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const safeName = String(name).slice(0, 20).replace(/[<>]/g, '')
  const rank = await submitLeaderboardScore(game, safeName, score)
  return NextResponse.json({ rank })
}
