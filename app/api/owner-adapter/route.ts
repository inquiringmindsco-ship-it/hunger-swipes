import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getOwnerMetrics, normalizeOwnerQuery, searchOwnerRecords } from '@/lib/owner-adapter'

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const supplied = Buffer.from(request.headers.get('x-img-adapter-secret') || '')
  const expected = Buffer.from(process.env.HUNGER_SWIPES_ADAPTER_SECRET || '')
  return supplied.length > 0 && supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const query = normalizeOwnerQuery(new URL(request.url).searchParams.get('q') || '')
  if (query && query.length < 2) return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })

  try {
    const metrics = await getOwnerMetrics()
    const results = query ? await searchOwnerRecords(query) : []
    return NextResponse.json({
      provider: 'hunger-swipes', state: 'available', metrics, results,
      rules: {
        totalBusinesses: 'sellers count', liveBusinesses: 'sellers where status=active',
        pendingBusinessSubmissions: 'business_submissions where status in (new,contacted)',
        pendingPlaceClaims: 'place_claims where status=pending',
        pendingModeration: 'community_food_posts where status=active and moderation_status=pending_review',
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ provider: 'hunger-swipes', state: 'unavailable', error: 'Provider unavailable' }, { status: 503 })
  }
}
