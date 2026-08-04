import { NextRequest, NextResponse } from 'next/server'
import { getDayNumber } from '@/lib/dayNumber'
import { dailyIndex, DAILY_SALT } from '@/lib/dailyPick'
import { generateAIPuzzle, getAIProvider } from '@/lib/ai'
import {
  curatedCount,
  getCuratedPuzzle,
  rememberAIPuzzle,
  toClientPuzzle,
} from '@/lib/puzzleStore'

export const dynamic = 'force-dynamic'

function randomCurated() {
  return getCuratedPuzzle(Math.floor(Math.random() * curatedCount))
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') ?? 'daily'

  if (mode === 'daily') {
    const day = getDayNumber()
    return NextResponse.json(
      toClientPuzzle(getCuratedPuzzle(dailyIndex(day, curatedCount, DAILY_SALT.ideaBridge))),
    )
  }

  if (mode === 'practice') {
    return NextResponse.json(toClientPuzzle(randomCurated()))
  }

  if (mode === 'ai') {
    // If no AI is configured, tell the client so it can show the right UI
    if (getAIProvider() === 'none') {
      return NextResponse.json(
        { error: 'no-ai', fallback: toClientPuzzle(randomCurated()) },
        { status: 503 },
      )
    }
    const puzzle = await generateAIPuzzle()
    // generateAIPuzzle returns null if generation failed — fall back to curated
    if (!puzzle) return NextResponse.json(toClientPuzzle(randomCurated()))

    // AI puzzles aren't in puzzles.json, so stash the answers for later lookup
    rememberAIPuzzle(puzzle)
    return NextResponse.json(toClientPuzzle(puzzle))
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
