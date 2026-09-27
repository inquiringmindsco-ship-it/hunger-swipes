import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyStaffToken, COOKIE_NAME } from '@/lib/staff-auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value
    const payload = verifyStaffToken(token)
    if (!payload) return NextResponse.json({ error: 'Staff session expired or invalid' }, { status: 401 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error } = await admin
      .from('sellers')
      .select('id, slug, business_name, logo_url, status')
      .eq('id', payload.seller_id)
      .eq('slug', payload.slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!seller) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    return NextResponse.json({ seller }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value
    const payload = verifyStaffToken(token)
    if (!payload) return NextResponse.json({ error: 'Staff session expired or invalid' }, { status: 401 })

    const body = await request.json()
    const { name, description, price, photo_url } = body

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const priceNum = typeof price === 'number' ? price : Number.parseFloat(price || '')
    const trimmedPhoto = typeof photo_url === 'string' ? photo_url.trim() : ''

    if (!trimmedName) {
      return NextResponse.json({ error: 'Dish name is required' }, { status: 400 })
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'A valid price greater than $0 is required' }, { status: 400 })
    }
    if (!trimmedPhoto) {
      return NextResponse.json({ error: 'A dish photo is required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    // Staff can only add dishes to the restaurant they authenticated for.
    const { data: seller } = await admin
      .from('sellers')
      .select('id')
      .eq('id', payload.seller_id)
      .eq('slug', payload.slug)
      .eq('status', 'active')
      .maybeSingle()
    if (!seller) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    const { data: place } = await admin.from('places').select('id').eq('claimed_seller_id', seller.id).maybeSingle()

    const { data, error } = await admin
      .from('dishes')
      .insert({
        seller_id: seller.id,
        place_id: place?.id || null,
        name: trimmedName,
        description: typeof description === 'string' ? description.trim() || null : null,
        photo_url: trimmedPhoto,
        price: priceNum,
        availability: 'available',
        category: null,
        tags: [],
        status: 'draft', // Owner/admin activates via existing dashboard. Prevents accidental publication.
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dish: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
