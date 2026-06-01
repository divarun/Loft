import { NextResponse } from 'next/server'
import { getDayNumber } from '@/lib/dayNumber'
import countries from '@/data/countries.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  const day = getDayNumber()
  const country = countries[day % countries.length]
  // Return only code and dayNumber — client loads its own copy for the full object
  return NextResponse.json({ dayNumber: day, countryCode: country.code, countryName: country.name })
}
