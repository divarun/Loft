import { NextRequest, NextResponse } from 'next/server'
import { getFullPuzzle, toSolution } from '@/lib/puzzleStore'

export const dynamic = 'force-dynamic'

/** The intended chain plus the closing fact. Fetched once the puzzle is over. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const puzzle = getFullPuzzle(id)
  if (!puzzle) {
    return NextResponse.json({ error: 'Unknown puzzle' }, { status: 404 })
  }

  return NextResponse.json(toSolution(puzzle))
}
