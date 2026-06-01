import { NextRequest, NextResponse } from 'next/server'
import { getDayNumber } from '@/lib/dayNumber'
import { generateAIPuzzle, getAIProvider } from '@/lib/ai'
import puzzles from '@/data/puzzles.json'

function randomCurated() {
  const idx = Math.floor(Math.random() * puzzles.length)
  return { ...puzzles[idx], source: 'curated' as const }
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') ?? 'daily'

  if (mode === 'daily') {
    const day = getDayNumber()
    return NextResponse.json({ ...puzzles[day % puzzles.length], source: 'curated' })
  }

  if (mode === 'practice') {
    return NextResponse.json(randomCurated())
  }

  if (mode === 'ai') {
    // If no AI is configured, tell the client so it can show the right UI
    if (getAIProvider() === 'none') {
      return NextResponse.json({ error: 'no-ai', fallback: randomCurated() }, { status: 503 })
    }
    const puzzle = await generateAIPuzzle()
    // generateAIPuzzle returns null if generation failed — fall back to curated
    return NextResponse.json(puzzle ?? randomCurated())
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
