import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { boundedLimit, isOwnedManagedPhotoUrl, mapCommunityPost, mapOfficialDish } from '@/lib/food'
import { haversineMiles } from '@/lib/geo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    const values = (single: string, plural: string) => (searchParams.get(plural) || searchParams.get(single) || '').split(',').map((value) => value.trim()).filter(Boolean).slice(0, 12)
    const cuisineTags = values('cuisineTag', 'cuisineTags')
    const dietaryTags = values('dietaryTag', 'dietaryTags')
    const healthCategories = values('healthCategory', 'healthCategories')
    const priceRange = searchParams.get('priceRange')
    const priceRanges = (searchParams.get('priceRanges') || priceRange || '').split(',').filter((value) => ['$', '$$', '$$$'].includes(value))
    const requestedSpice = Number.parseInt(searchParams.get('spiceLevel') || '0', 10)
    const spiceLevel = requestedSpice >= 1 && requestedSpice <= 5 ? requestedSpice : 0
    const limit = boundedLimit(searchParams.get('limit'))
    const mode = searchParams.get('mode') || 'for-you'
    const offset = Math.max(0, Math.min(Number.parseInt(searchParams.get('offset') || '0', 10) || 0, 500))
    const excludedByClient = new Set(searchParams.getAll('exclude').filter((value) => /^(official|community):[0-9a-f-]{36}$/i.test(value)).slice(0, 100))
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const radius = Math.min(Math.max(Number(searchParams.get('radius')) || 15, 1), 100)
    if (!['for-you', 'nearby', 'trending'].includes(mode)) return NextResponse.json({ error: 'Invalid feed mode', dishes: [] }, { status: 400 })
    if (mode === 'nearby' && (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
      return NextResponse.json({ error: 'Location is required for Nearby', code: 'LOCATION_REQUIRED', dishes: [] }, { status: 400 })
    }

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
    for (const key of excludedByClient) excluded.add(key)
    const savedKeys = new Set((saved || []).map((row: any) => `${row.content_kind}:${row.content_id}`))

    let officialQuery = admin
      .from('dishes')
      .select(`
        *,
        video_media:food_media!dish_id(*),
        seller:sellers!inner(id,business_name,seller_type,description,logo_url,location_text,address,latitude,longitude,service_area,phone,hours_text,pickup_available,delivery_available,ordering_method,ordering_url,status,verification_status)
      `)
      .eq('status', 'active')
      .eq('availability', 'available')
      .eq('sellers.status', 'active')
      .not('photo_url', 'is', null)
      .neq('photo_url', '')
      .neq('name', '')
      .neq('sellers.business_name', '')
      .order(mode === 'trending' ? 'right_swipes' : 'created_at', { ascending: false })
      .limit(Math.min((offset + limit + 1) * 2, 1000))

    if (sellerId) {
      officialQuery = officialQuery.eq('seller_id', sellerId)
    }

    if (cuisineTags.length) officialQuery = officialQuery.overlaps('tags', cuisineTags)
    if (dietaryTags.length) officialQuery = officialQuery.overlaps('tags', dietaryTags)
    if (healthCategories.length) officialQuery = officialQuery.overlaps('tags', healthCategories)
    if (priceRange && !searchParams.has('priceRanges')) {
      if (priceRange === '$') officialQuery = officialQuery.lte('price', 12)
      else if (priceRange === '$$') officialQuery = officialQuery.gte('price', 12).lte('price', 24)
      else if (priceRange === '$$$') officialQuery = officialQuery.gte('price', 24)
    }

    let communityQuery = admin.from('community_food_posts').select(`*, place:places!inner(id,name,location_text,address,city,state,latitude,longitude,phone,website,order_url,status)`)
      .eq('status', 'active').eq('moderation_status', 'approved').eq('places.status', 'active').order(mode === 'trending' ? 'right_swipes' : 'created_at', { ascending: false }).limit(Math.min((offset + limit + 1) * 2, 1000))
    if (cuisineTags.length) communityQuery = communityQuery.overlaps('tags', cuisineTags)
    if (dietaryTags.length) communityQuery = communityQuery.overlaps('tags', dietaryTags)
    if (healthCategories.length) communityQuery = communityQuery.overlaps('tags', healthCategories)
    if (priceRange && !searchParams.has('priceRanges')) {
      if (priceRange === '$') communityQuery = communityQuery.lte('price', 12)
      else if (priceRange === '$$') communityQuery = communityQuery.gte('price', 12).lte('price', 24)
      else if (priceRange === '$$$') communityQuery = communityQuery.gte('price', 24)
    }

    const [{ data: official, error: officialError }, { data: community, error: communityError }] = await Promise.all([officialQuery, communityQuery])
    if (officialError || communityError) return NextResponse.json({ error: officialError?.message || communityError?.message, dishes: [] }, { status: 500 })
    const merged = [
      ...(official || []).map(mapOfficialDish),
      ...(community || []).map(mapCommunityPost),
    ].filter((item: any) => !excluded.has(`${item.content_kind}:${item.id}`))
      .filter((item: any) => !spiceLevel || Number(item.spice_level) === spiceLevel)
      .filter((item: any) => {
        if (!priceRanges.length) return true
        const price = Number(item.price)
        const range = !Number.isFinite(price) || price < 12 ? '$' : price < 24 ? '$$' : '$$$'
        return priceRanges.includes(range)
      })
      .map((item: any) => ({ ...item, saved: savedKeys.has(`${item.content_kind}:${item.id}`) }))
      .map((item: any) => {
        if (mode !== 'nearby') return item
        const itemLat = Number(item.seller?.latitude)
        const itemLng = Number(item.seller?.longitude)
        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) return null
        return { ...item, distance_miles: Math.round(haversineMiles(lat, lng, itemLat, itemLng) * 10) / 10 }
      })
      .filter((item: any) => item && (mode !== 'nearby' || item.distance_miles <= radius))
      .sort((a: any, b: any) => mode === 'trending'
        ? (b.right_swipes || 0) - (a.right_swipes || 0)
        : mode === 'nearby'
          ? a.distance_miles - b.distance_miles
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const page = merged.slice(offset, offset + limit + 1)
    const result = page.slice(0, limit)

    // Enrich official dishes with approved video URLs and recipe previews.
    const officialIds = result.filter((d: any) => d.content_kind === 'official').map((d: any) => d.id)
    if (officialIds.length) {
      const [{ data: recipes }, { data: mediaRows }] = await Promise.all([
        admin.from('recipes').select('id,dish_id,title,description,price,photo_url').eq('status', 'active').eq('published', true).in('dish_id', officialIds),
        admin.from('food_media').select('*').eq('kind', 'video').eq('moderation_status', 'approved').in('dish_id', officialIds),
      ])
      const mediaByDish = Object.fromEntries((mediaRows || []).map((m: any) => [m.dish_id, m]))
      const recipeByDish = Object.fromEntries((recipes || []).map((r: any) => [r.dish_id, r]))
      const admin2 = getSupabaseAdmin()
      for (const item of result) {
        if (item.content_kind !== 'official') continue
        const media = mediaByDish[item.id]
        if (media?.optimized_path) {
          const { data: url } = admin2!.storage.from('food-media').getPublicUrl(media.optimized_path)
          item.video_url = url.publicUrl
          item.video_duration = media.duration_seconds
        }
        if (media?.thumbnail_path) {
          const { data: url } = admin2!.storage.from('food-media').getPublicUrl(media.thumbnail_path)
          item.poster_url = url.publicUrl
        }
        const recipe = recipeByDish[item.id]
        if (recipe) item.recipe_preview = recipe
      }
    }

    return NextResponse.json({ dishes: result, hasMore: page.length > limit, nextOffset: offset + Math.min(limit, page.length) })
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
      video_media_id,
      poster_url,
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
    const insert: any = {
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
    }
    if (video_media_id) insert.video_media_id = video_media_id
    if (poster_url) insert.poster_url = poster_url

    const { data, error } = await admin
      .from('dishes')
      .insert(insert)
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
      'name', 'description', 'photo_url', 'video_media_id', 'poster_url', 'price', 'availability', 'category', 'tags', 'status',
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
