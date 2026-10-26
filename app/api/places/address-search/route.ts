import { NextRequest, NextResponse } from 'next/server'
import { ADDRESS_SEARCH_ATTRIBUTION, mapNominatimAddress } from '@/lib/address-search'
import { getRequestUser } from '@/lib/server-auth'

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required', suggestions: [] }, { status: 401 })

  const params = new URL(request.url).searchParams
  const query = params.get('q')?.trim().slice(0, 240) || ''
  if (query.length < 5) return NextResponse.json({ error: 'Enter a fuller street address', suggestions: [] }, { status: 400 })

  const latitude = Number(params.get('lat'))
  const longitude = Number(params.get('lng'))
  const hasCoordinates = params.has('lat') && params.has('lng') && Number.isFinite(latitude) && Number.isFinite(longitude)
  const providerParams = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'us',
  })
  if (hasCoordinates) {
    const latitudeRadius = 0.5
    const longitudeRadius = 0.65
    providerParams.set('viewbox', `${longitude - longitudeRadius},${latitude + latitudeRadius},${longitude + longitudeRadius},${latitude - latitudeRadius}`)
  }

  try {
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${providerParams}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'HungerSwipes/1.0 (support@hungerswipes.com)',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Address provider returned ${response.status}`)
    const payload = await response.json()
    const suggestions = Array.isArray(payload) ? payload.map(mapNominatimAddress).filter(Boolean) : []
    return NextResponse.json({ suggestions, attribution: ADDRESS_SEARCH_ATTRIBUTION }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Address suggestions are temporarily unavailable', suggestions: [] }, { status: 503 })
  }
}
