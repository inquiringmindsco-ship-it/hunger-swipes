import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { boundedLimit, isOwnedManagedPhotoUrl, mapCommunityPost, mapOfficialDish } from '@/lib/food'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    const cuisineTag = searchParams.get('cuisineTag')
    const dietaryTag = searchParams.get('dietaryTag')
    const healthCategory = searchParams.get('healthCategory')
    const priceRange = searchParams.get('priceRange')
    const limit = boundedLimit(searchParams.get('limit'))
    const mode = searchParams.get('mode') || 'for-you'

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Database not configured', dishes: [] }, { status: 503 })
    }

    const user = await getRequestUser(request)
    const [{ data: swiped }, { data: saved }] = user ? await Promise.all([
      admin.from('food_swipes').select('content_kind,content_id').eq('actor_id', user.id),
      admin.from('saved_food').select('content_kind,content_id').eq('actor_id', user.id),
    ]) : [{ data: [] }, { data: [] }]
    const excluded = new Set((swiped || []).map((row: any) => `${row.content_kind}:${row.content_id}`))
    const savedKeys = new Set((saved || []).map((row: any) => `${row.content_kind}:${row.content_id}`))

    let officialQuery = admin
      .from('dishes')
      .select(`
        *,
        seller:sellers!inner(id,business_name,seller_type,description,logo_url,location_text,service_area,phone,hours_text,pickup_available,delivery_available,ordering_method,ordering_url,status,verification_status)
      `)
      .eq('status', 'active')
      .eq('availability', 'available')
      .eq('sellers.status', 'active')
      .not('photo_url', 'is', null)
      .neq('photo_url', '')
      .neq('name', '')
      .neq('sellers.business_name', '')
      .order(mode === 'trending' ? 'right_swipes' : 'created_at', { ascending: false })
      .limit(limit * 2)

    if (sellerId) {
      officialQuery = officialQuery.eq('seller_id', sellerId)
    }

    if (cuisineTag) {
      officialQuery = officialQuery.contains('tags', [cuisineTag])
    }
    if (dietaryTag) {
      officialQuery = officialQuery.contains('tags', [dietaryTag])
    }
    if (healthCategory) {
      officialQuery = officialQuery.contains('tags', [healthCategory])
    }
    if (priceRange) {
      if (priceRange === '$') officialQuery = officialQuery.lte('price', 12)
      else if (priceRange === '$$') officialQuery = officialQuery.gte('price', 12).lte('price', 24)
      else if (priceRange === '$$$') officialQuery = officialQuery.gte('price', 24)
    }

    let communityQuery = admin.from('community_food_posts').select(`*, place:places!inner(id,name,location_text,status)`)
      .eq('status', 'active').eq('places.status', 'active').order(mode === 'trending' ? 'right_swipes' : 'created_at', { ascending: false }).limit(limit * 2)
    if (cuisineTag) communityQuery = communityQuery.contains('tags', [cuisineTag])
    if (dietaryTag) communityQuery = communityQuery.contains('tags', [dietaryTag])
    if (healthCategory) communityQuery = communityQuery.contains('tags', [healthCategory])
    if (priceRange === '$') communityQuery = communityQuery.lte('price', 12)
    else if (priceRange === '$$') communityQuery = communityQuery.gte('price', 12).lte('price', 24)
    else if (priceRange === '$$$') communityQuery = communityQuery.gte('price', 24)

    const [{ data: official, error: officialError }, { data: community, error: communityError }] = await Promise.all([officialQuery, communityQuery])
    if (officialError || communityError) return NextResponse.json({ error: officialError?.message || communityError?.message, dishes: [] }, { status: 500 })
    const merged = [
      ...(official || []).map(mapOfficialDish),
      ...(community || []).map(mapCommunityPost),
    ].filter((item: any) => !excluded.has(`${item.content_kind}:${item.id}`))
      .map((item: any) => ({ ...item, saved: savedKeys.has(`${item.content_kind}:${item.id}`) }))
      .sort((a: any, b: any) => mode === 'trending'
        ? (b.right_swipes || 0) - (a.right_swipes || 0)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
    return NextResponse.json({ dishes: merged })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, dishes: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const {
      seller_id,
      name,
      description,
      photo_url,
      price,
      availability,
      category,
      tags,
      status,
    } = body

    if (!seller_id || !name?.trim()) {
      return NextResponse.json({ error: 'seller_id and name are required' }, { status: 400 })
    }
    if ((status || 'active') === 'active' && !photo_url?.trim()) {
      return NextResponse.json({ error: 'A real dish photo is required before publishing' }, { status: 400 })
    }
    if (photo_url && !isOwnedManagedPhotoUrl(photo_url, user.id)) return NextResponse.json({ error: 'Dish photo must be one of your verified HungerSwipes uploads' }, { status: 400 })
    if (status && !['draft', 'active'].includes(status)) {
      return NextResponse.json({ error: 'Invalid seller-managed dish status' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error: sellerError } = await admin
      .from('sellers')
      .select('id')
      .eq('id', seller_id)
      .eq('owner_user_id', user.id)
      .maybeSingle()
    if (sellerError || !seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    const { data: place } = await admin.from('places').select('id').eq('claimed_seller_id', seller_id).maybeSingle()
    const { data, error } = await admin
      .from('dishes')
      .insert({
        seller_id,
        place_id: place?.id || null,
        name: name.trim(),
        description: description || null,
        photo_url: photo_url || null,
        price: typeof price === 'number' ? price : 0,
        availability: availability || 'available',
        category: category || null,
        tags: tags || [],
        status: status || 'active',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dish: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const allowed = [
      'name', 'description', 'photo_url', 'price', 'availability', 'category', 'tags', 'status',
      'recipe_available', 'recipe_access_type', 'recipe_price', 'recipe_preview'
    ]
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: existing, error: existingError } = await admin
      .from('dishes')
      .select('photo_url, seller:sellers!inner(owner_user_id)')
      .eq('id', id)
      .eq('sellers.owner_user_id', user.id)
      .maybeSingle()
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Dish not found' }, { status: 404 })

    if (update.status && !['draft', 'active', 'removed'].includes(update.status)) {
      return NextResponse.json({ error: 'Invalid seller-managed dish status' }, { status: 400 })
    }
    if (update.status === 'active' && !(update.photo_url || existing.photo_url)?.trim()) {
      return NextResponse.json({ error: 'A real dish photo is required before publishing' }, { status: 400 })
    }
    if (update.photo_url && !isOwnedManagedPhotoUrl(update.photo_url, user.id)) return NextResponse.json({ error: 'Dish photo must be one of your verified HungerSwipes uploads' }, { status: 400 })

    const { data, error } = await admin
      .from('dishes')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dish: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: owned } = await admin
      .from('dishes')
      .select('id, seller:sellers!inner(owner_user_id)')
      .eq('id', id)
      .eq('sellers.owner_user_id', user.id)
      .maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Dish not found' }, { status: 404 })

    const { error } = await admin.from('dishes').update({ status: 'removed' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
