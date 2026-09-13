import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

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
      return NextResponse.json({ error: 'Database not configured', dishes: [] }, { status: 503 })
    }

    let query = admin
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

    const { data, error } = await admin
      .from('dishes')
      .insert({
        seller_id,
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
