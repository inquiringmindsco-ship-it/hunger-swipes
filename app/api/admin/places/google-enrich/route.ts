import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { findHighConfidenceGooglePlace } from '@/lib/google-places'

function isAdmin(request: NextRequest) {
  const provided = Buffer.from(request.headers.get('x-admin-secret') || '')
  const expected = Buffer.from(process.env.ADMIN_SECRET || '')
  return expected.length > 0 && provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY is not configured', configured: false }, { status: 503 })
  const body = await request.json().catch(() => ({}))
  const mode = body.mode === 'import' ? 'import' : body.mode === 'preview' ? 'preview' : null
  const limit = Math.min(Math.max(Math.round(Number(body.limit)) || 25, 1), 100)
  if (!mode) return NextResponse.json({ error: 'mode (preview|import) is required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data: run, error: runError } = await admin.from('place_google_enrichment_runs').insert({ mode, requested_limit: limit }).select('id').single()
  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })
  const errors: string[] = []
  try {
    let query = admin.from('places').select('id,name,address,latitude,longitude,phone,google_place_id,last_google_match_at,last_google_enrichment_at').eq('status', 'active').order('last_google_enrichment_at', { ascending: true, nullsFirst: true }).limit(limit)
    if (!body.force) query = query.is('google_place_id', null).or(`last_google_enrichment_at.is.null,last_google_enrichment_at.lt.${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()}`)
    const { data: places, error } = await query
    if (error) throw new Error(error.message)
    let matched = 0, unchanged = 0, noMatch = 0
    const results: any[] = []
    for (const place of places || []) {
      if (place.google_place_id && !body.force) { unchanged++; continue }
      try {
        const match = await findHighConfidenceGooglePlace(place, apiKey)
        if (!match) {
          if (mode === 'import') await admin.from('places').update({ last_google_enrichment_at: new Date().toISOString() }).eq('id', place.id)
          noMatch++; results.push({ placeId: place.id, name: place.name, action: 'no_match' }); continue
        }
        results.push({ placeId: place.id, name: place.name, action: mode === 'import' ? 'matched' : 'preview_match', confidence: match.confidence, googlePlaceId: match.googlePlaceId })
        if (mode === 'import') {
          const matchedAt = new Date().toISOString()
          const { error: updateError } = await admin.from('places').update({ google_place_id: match.googlePlaceId, google_match_confidence: match.confidence, last_google_match_at: matchedAt, last_google_enrichment_at: matchedAt }).eq('id', place.id)
          if (updateError) throw new Error(updateError.message)
        }
        matched++
      } catch (error: any) { errors.push(`${place.id}: ${error.message}`) }
    }
    const summary = { considered: places?.length || 0, matched, unchanged, noMatch, errors }
    await admin.from('place_google_enrichment_runs').update({ status: errors.length ? 'failed' : 'completed', considered_count: summary.considered, matched_count: matched, unchanged_count: unchanged, no_match_count: noMatch, error_count: errors.length, errors, completed_at: new Date().toISOString() }).eq('id', run.id)
    return NextResponse.json({ configured: true, mode, summary, results })
  } catch (error: any) {
    await admin.from('place_google_enrichment_runs').update({ status: 'failed', error_count: 1, errors: [error.message], completed_at: new Date().toISOString() }).eq('id', run.id)
    return NextResponse.json({ error: error.message }, { status: 502 })
  }
}
