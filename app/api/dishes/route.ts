import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eaterId = searchParams.get('eaterId')
    const sellerId = searchParams.get('sellerId')
    const cuisineTag = searchParams.get('cuisineTag')
    const dietaryTag = searchParams.get('dietaryTag')
    const healthCategory = searchParams.get('healthCategory')
    const priceRange = searchParams.get('priceRange')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const admin = getSupabaseAdmin()
    if (!admin) {
      // Fallback: return mock-friendly shape using photos route or hardcoded
      return NextResponse.json({ dishes: [], mock: true })
    }

    let query = admin
      .from('dishes')
      .select(`
        *,
        seller:sellers!inner(*)
      `)
      .eq('status', 'active')
      .eq('availability', 'available')
      .eq('sellers.status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sellerId) {
      query = query.eq('seller_id', sellerId)
    }

    if (cuisineTag) {
      query = query.or(`category.ilike.%${cuisineTag}%,tags.cs.{${cuisineTag}}`)
    }
    if (dietaryTag) {
      query = query.or(`category.ilike.%${dietaryTag}%,tags.cs.{${dietaryTag}}`)
    }
    if (healthCategory) {
      query = query.or(`category.ilike.%${healthCategory}%,tags.cs.{${healthCategory}}`)
    }
    if (priceRange) {
      if (priceRange === '$') query = query.lte('price', 12)
      else if (priceRange === '$$') query = query.gte('price', 12).lte('price', 24)
      else if (priceRange === '$$$') query = query.gte('price', 24)
    }

    // Exclude already swiped by this eater
    if (eaterId) {
      const { data: swiped } = await admin
        .from('swipes')
        .select('dish_id')
        .eq('eater_id', eaterId)
      const ids = (swiped || []).map((s: any) => s.dish_id)
      if (ids.length > 0) {
        query = query.not('id', 'in', `(${ids.join(',')})`)
      }
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message, dishes: [] }, { status: 500 })

    return NextResponse.json({ dishes: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, dishes: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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

    if (!seller_id || !name) {
      return NextResponse.json({ error: 'seller_id and name are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error: sellerError } = await admin
      .from('sellers')
      .select('id')
      .eq('id', seller_id)
      .single()
    if (sellerError || !seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    const { data, error } = await admin
      .from('dishes')
      .insert({
        seller_id,
        name,
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
    const allowed = [
      'name', 'description', 'photo_url', 'price', 'availability', 'category', 'tags', 'status',
      'recipe_available', 'recipe_access_type', 'recipe_price', 'recipe_preview'
    ]
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

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
