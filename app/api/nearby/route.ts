import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const radius = Math.min(Math.max(Number(params.get('radius')) || 15, 1), 100)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', places: [] }, { status: 503 })
  const { data, error } = await admin.from('places').select('id,name,location_text,address,latitude,longitude,claimed_seller_id,source').eq('status', 'active').not('latitude', 'is', null).not('longitude', 'is', null)
  if (error) return NextResponse.json({ error: error.message, places: [] }, { status: 500 })
  const places = (data || []).map((place: any) => ({ ...place, distanceMiles: Math.round(haversineMiles(lat, lng, place.latitude, place.longitude) * 10) / 10 })).filter((place: any) => place.distanceMiles <= radius).sort((a: any, b: any) => a.distanceMiles - b.distanceMiles)
  return NextResponse.json({ places, vendors: places.map((place: any) => ({ ...place, name: place.name, active: true, verified: Boolean(place.claimed_seller_id) })), userLocation: { lat, lng }, count: places.length })
}
