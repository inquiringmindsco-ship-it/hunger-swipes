import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { boundedLimit } from '@/lib/food'

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', places: [] }, { status: 503 })
  let query = admin.from('places').select('id,name,location_text,address,latitude,longitude,claimed_seller_id,source').eq('status', 'active').order('name').limit(boundedLimit(params.get('limit'), 25, 50))
  const search = params.get('q')?.trim()
  if (search) query = query.ilike('name', `%${search.replace(/[%_,()]/g, '')}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, places: [] }, { status: 500 })
  return NextResponse.json({ places: data || [] })
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
  const { data, error } = await admin.from('places').insert({ name, location_text: location, address: body.address || null, latitude: body.latitude || null, longitude: body.longitude || null, source: 'community', created_by: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ place: data }, { status: 201 })
}
