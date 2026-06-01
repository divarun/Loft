import { NextRequest, NextResponse } from 'next/server'
import { validateBridgeStep } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { from, userInput, targetWord } = await req.json()
  if (!from || !userInput || !targetWord) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const result = await validateBridgeStep({ from, userInput, targetWord })
  return NextResponse.json(result)
}
