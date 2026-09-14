import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { mapCommunityPost, mapOfficialDish, normalizeContentKind } from '@/lib/food'

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    const { data: rows, error } = await admin.from('saved_food').select('*').eq('actor_id', user.id).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const officialIds = (rows || []).filter((r: any) => r.content_kind === 'official').map((r: any) => r.content_id)
    const communityIds = (rows || []).filter((r: any) => r.content_kind === 'community').map((r: any) => r.content_id)
    const [officialResult, communityResult] = await Promise.all([
      officialIds.length ? admin.from('dishes').select(`*,seller:sellers!inner(id,business_name,seller_type,location_text,phone,hours_text,pickup_available,delivery_available,ordering_method,ordering_url,status,verification_status)`).in('id', officialIds).eq('status', 'active').eq('sellers.status', 'active') : Promise.resolve({ data: [], error: null }),
      communityIds.length ? admin.from('community_food_posts').select(`*,place:places!inner(id,name,location_text,address,city,state,latitude,longitude,phone,website,order_url,status)`).in('id', communityIds).eq('status', 'active').eq('places.status', 'active') : Promise.resolve({ data: [], error: null }),
    ])
    if (officialResult.error || communityResult.error) return NextResponse.json({ error: officialResult.error?.message || communityResult.error?.message }, { status: 500 })
    const content = new Map<string, any>()
    for (const dish of officialResult.data || []) content.set(`official:${dish.id}`, mapOfficialDish(dish))
    for (const post of communityResult.data || []) content.set(`community:${post.id}`, mapCommunityPost(post))
    const saved = (rows || []).map((row: any) => ({ id: `${row.content_kind}:${row.content_id}`, content_kind: row.content_kind, dish: content.get(`${row.content_kind}:${row.content_id}`) })).filter((row: any) => row.dish)
    return NextResponse.json({ saved })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const contentId = params.get('contentId') || params.get('dishId')
  const contentKind = normalizeContentKind(params.get('contentKind') || 'official')
  if (!contentId || !contentKind) return NextResponse.json({ error: 'Valid contentId and contentKind are required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { error } = await admin.from('saved_food').delete().eq('actor_id', user.id).eq('content_kind', contentKind).eq('content_id', contentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
