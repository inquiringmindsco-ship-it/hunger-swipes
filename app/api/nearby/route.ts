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
  const fields = 'id,name,place_type,location_text,address,city,state,postal_code,latitude,longitude,phone,website,order_url,category,cuisine,hours,operational_status,external_source,external_source_id,claimed_status,claimed_seller_id,google_place_id,approved_owner_place_image_url,approved_community_place_image_url'
  const safe = area?.replace(/[%_,()]/g, '').slice(0, 80)
  const rows: any[] = []
  if (hasCoordinates) {
    const latitudeDelta = radius / 69
    const longitudeDelta = radius / (69 * Math.max(Math.cos(lat * Math.PI / 180), 0.01))
    for (let from = 0; ; from += 1000) {
      let page = admin.from('places').select(fields).eq('status', 'active').gte('latitude', lat - latitudeDelta).lte('latitude', lat + latitudeDelta).gte('longitude', lng - longitudeDelta).lte('longitude', lng + longitudeDelta).range(from, from + 999)
      if (safe) page = page.or(`name.ilike.%${safe}%,location_text.ilike.%${safe}%,address.ilike.%${safe}%,city.ilike.%${safe}%,postal_code.ilike.%${safe}%,cuisine.ilike.%${safe}%,category.ilike.%${safe}%`)
      const { data, error } = await page
      if (error) return NextResponse.json({ error: error.message, places: [] }, { status: 500 })
      rows.push(...(data || [])); if (!data || data.length < 1000) break
    }
  } else {
    let query = admin.from('places').select(fields).eq('status', 'active').limit(250)
    if (safe) query = query.or(`name.ilike.%${safe}%,location_text.ilike.%${safe}%,address.ilike.%${safe}%,city.ilike.%${safe}%,postal_code.ilike.%${safe}%,cuisine.ilike.%${safe}%,category.ilike.%${safe}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message, places: [] }, { status: 500 })
    rows.push(...(data || []))
  }
  const places = rows.map((row: any) => { const { google_place_id, approved_owner_place_image_url, approved_community_place_image_url, ...place } = row; const approved_place_image_url = approved_owner_place_image_url || approved_community_place_image_url || null; const enriched = { ...place, approved_place_image_url, google_photo_enabled: Boolean(!approved_place_image_url && process.env.GOOGLE_PLACES_API_KEY && google_place_id) }; return hasCoordinates ? { ...enriched, distanceMiles: Math.round(haversineMiles(lat, lng, Number(place.latitude), Number(place.longitude)) * 10) / 10 } : enriched }).filter((place: any) => !hasCoordinates || place.distanceMiles <= radius).sort((a: any, b: any) => hasCoordinates ? a.distanceMiles - b.distanceMiles : a.name.localeCompare(b.name))
  return NextResponse.json({ places, vendors: places, userLocation: hasCoordinates ? { lat, lng } : null, count: places.length, attribution: { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' } })
}
