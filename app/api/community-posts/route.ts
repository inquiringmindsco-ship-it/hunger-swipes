import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { boundedLimit, isManagedPhotoUrl, mapCommunityPost } from '@/lib/food'

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const mine = params.get('mine') === 'true'
  const user = mine ? await getRequestUser(request) : null
  if (mine && !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', posts: [] }, { status: 503 })
  let query = admin.from('community_food_posts').select(`*,place:places!inner(id,name,location_text,status)`).eq('places.status', 'active').order('created_at', { ascending: false }).limit(boundedLimit(params.get('limit')))
  query = mine ? query.eq('user_id', user!.id) : query.eq('status', 'active')
  if (params.get('placeId')) query = query.eq('place_id', params.get('placeId')!)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, posts: [] }, { status: 500 })
  return NextResponse.json({ posts: (data || []).map(mapCommunityPost) })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const dishName = typeof body.dish_name === 'string' ? body.dish_name.trim() : ''
  if (!body.place_id || dishName.length < 2 || dishName.length > 160 || !isManagedPhotoUrl(body.photo_url)) return NextResponse.json({ error: 'Place, food name, and a verified HungerSwipes upload are required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data: place } = await admin.from('places').select('id').eq('id', body.place_id).eq('status', 'active').maybeSingle()
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })
  const creatorName = String(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Community member').slice(0, 100)
  const numericPrice = Number(body.price)
  const { data, error } = await admin.from('community_food_posts').insert({ place_id: place.id, user_id: user.id, creator_name: creatorName, dish_name: dishName, description: typeof body.description === 'string' ? body.description.trim().slice(0, 1000) || null : null, photo_url: body.photo_url, price: Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : null, category: typeof body.category === 'string' ? body.category.trim().slice(0, 80) || null : null, tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 10) : [] }).select(`*,place:places!inner(id,name,location_text,status)`).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: mapCommunityPost(data) }, { status: 201 })
}
