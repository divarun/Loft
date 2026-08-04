import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeStep } from '@/lib/ai'
import { getFullPuzzle } from '@/lib/puzzleStore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { puzzleId, step, from, userInput } = await req.json()

  if (puzzleId == null || typeof step !== 'number' || !from || !userInput) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (typeof userInput !== 'string' || userInput.length > 100) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // The answer is resolved here rather than sent up by the client, so the
  // browser never has to know it.
  const puzzle = getFullPuzzle(puzzleId)
  const target = puzzle?.steps[step]
  if (!target) {
    return NextResponse.json({ error: 'Unknown puzzle or step' }, { status: 404 })
  }

  const result = await validateBridgeStep({
    from,
    userInput,
    targetWord: target.correct,
  })

  return NextResponse.json({
    ...result,
    // The step's explanation is only useful once it's been solved
    explain: result.valid ? target.explain : null,
  })
}
