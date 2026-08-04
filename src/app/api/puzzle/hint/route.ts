import { NextRequest, NextResponse } from 'next/server'
import { getFullPuzzle } from '@/lib/puzzleStore'

export const dynamic = 'force-dynamic'

/** Reveals a single step's answer. Costs the player points, hence the explicit call. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const step = Number(req.nextUrl.searchParams.get('step'))

  if (!id || !Number.isInteger(step) || step < 0) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 })
  }

  const puzzle = getFullPuzzle(id)
  const target = puzzle?.steps[step]
  if (!target) {
    return NextResponse.json({ error: 'Unknown puzzle or step' }, { status: 404 })
  }

  return NextResponse.json({ hint: target.correct })
}
