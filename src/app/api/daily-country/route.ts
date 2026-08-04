import { NextResponse } from 'next/server'
import { getDayNumber } from '@/lib/dayNumber'
import { dailyIndex, DAILY_SALT } from '@/lib/dailyPick'
import countries from '@/data/countries.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  const day = getDayNumber()
  const country = countries[dailyIndex(day, countries.length, DAILY_SALT.atlasRush)]
  // Return only code and dayNumber — client loads its own copy for the full object.
  // countryName is deliberately omitted: it was the answer, in plain text.
  return NextResponse.json({ dayNumber: day, countryCode: country.code })
}
