import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getLiveGooglePlacePhoto } from '@/lib/google-places'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Google Place photos are not configured' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { id } = await params
  const { data: place } = await admin.from('places').select('google_place_id').eq('id', id).eq('status', 'active').maybeSingle()
  if (!place?.google_place_id) return NextResponse.json({ error: 'No Google image is available' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  try {
    const photo = await getLiveGooglePlacePhoto(place.google_place_id, apiKey)
    if (!photo) return NextResponse.json({ error: 'No Google image is available' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    return NextResponse.json({ ...photo, provider: 'google' }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Google image unavailable' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
