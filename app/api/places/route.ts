import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { boundedLimit } from '@/lib/food'

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', places: [] }, { status: 503 })
  const limit = boundedLimit(params.get('limit'), 25, 100)
  let query = admin.from('places').select('id,name,place_type,location_text,address,city,state,postal_code,latitude,longitude,phone,website,order_url,category,cuisine,hours,operational_status,external_source,external_source_id,claimed_status,claimed_seller_id,source').eq('status', 'active').limit(limit)
  if (params.get('id')) query = query.eq('id', params.get('id')!)
  const search = params.get('q')?.trim()
  if (search) {
    const safe = search.replace(/[%_,()]/g, '').slice(0, 80)
    query = query.or(`name.ilike.%${safe}%,location_text.ilike.%${safe}%,address.ilike.%${safe}%,city.ilike.%${safe}%,category.ilike.%${safe}%,cuisine.ilike.%${safe}%`)
  }
  if (params.get('city')) query = query.ilike('city', `%${params.get('city')!.replace(/[%_,()]/g, '').slice(0, 80)}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, places: [] }, { status: 500 })
  const latitude = Number(params.get('lat'))
  const longitude = Number(params.get('lng'))
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && params.has('lat') && params.has('lng')
  const places = (data || []).map((place: any) => {
    if (!hasCoordinates || place.latitude == null || place.longitude == null) return place
    const latRadians = (latitude + Number(place.latitude)) * Math.PI / 360
    const x = (Number(place.longitude) - longitude) * Math.cos(latRadians)
    const y = Number(place.latitude) - latitude
    return { ...place, distanceMiles: Math.round(Math.sqrt(x * x + y * y) * Math.PI / 180 * 3958.8 * 10) / 10 }
  }).sort((a: any, b: any) => hasCoordinates ? (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity) : a.name.localeCompare(b.name))
  return NextResponse.json({ places, attribution: { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' } })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const location = typeof body.location_text === 'string' ? body.location_text.trim() : ''
  if (name.length < 2 || name.length > 160 || location.length < 2 || location.length > 240) return NextResponse.json({ error: 'Place name and location are required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data: existing } = await admin.from('places').select('*').eq('name', name).eq('location_text', location).eq('status', 'active').maybeSingle()
  if (existing) return NextResponse.json({ place: existing })
  const { data, error } = await admin.from('places').insert({ name, location_text: location, address: body.address || null, latitude: body.latitude || null, longitude: body.longitude || null, source: 'community', claimed_status: 'unclaimed', created_by: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ place: data }, { status: 201 })
}
