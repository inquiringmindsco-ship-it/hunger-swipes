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
  const hasCoordinates = params.has('lat') && params.has('lng')
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const area = params.get('q')?.trim()
  const radius = Math.min(Math.max(Number(params.get('radius')) || 15, 1), 100)
  if (!hasCoordinates && !area) return NextResponse.json({ error: 'Share coordinates or search an area' }, { status: 400 })
  if (hasCoordinates && (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)) return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', places: [] }, { status: 503 })
  let query = admin.from('places').select('id,name,place_type,location_text,address,city,state,postal_code,latitude,longitude,phone,website,order_url,category,cuisine,hours,operational_status,external_source,external_source_id,claimed_status,claimed_seller_id').eq('status', 'active').limit(250)
  if (area) {
    const safe = area.replace(/[%_,()]/g, '').slice(0, 80)
    query = query.or(`name.ilike.%${safe}%,location_text.ilike.%${safe}%,address.ilike.%${safe}%,city.ilike.%${safe}%,postal_code.ilike.%${safe}%,cuisine.ilike.%${safe}%,category.ilike.%${safe}%`)
  }
  if (hasCoordinates) query = query.not('latitude', 'is', null).not('longitude', 'is', null)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, places: [] }, { status: 500 })
  const places = (data || []).map((place: any) => hasCoordinates ? { ...place, distanceMiles: Math.round(haversineMiles(lat, lng, Number(place.latitude), Number(place.longitude)) * 10) / 10 } : place).filter((place: any) => !hasCoordinates || place.distanceMiles <= radius).sort((a: any, b: any) => hasCoordinates ? a.distanceMiles - b.distanceMiles : a.name.localeCompare(b.name))
  return NextResponse.json({ places, vendors: places, userLocation: hasCoordinates ? { lat, lng } : null, count: places.length, attribution: { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' } })
}
