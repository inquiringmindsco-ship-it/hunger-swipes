import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

const PUBLIC_SELLER_FIELDS = 'id,business_name,seller_type,description,logo_url,location_text,service_area,phone,hours_text,pickup_available,delivery_available,ordering_method,ordering_url,status,verification_status'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const mine = searchParams.get('mine') === 'true'
    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (id || mine) {
      const user = await getRequestUser(request)
      if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

      let query = admin
        .from('sellers')
        .select('*')
        .eq('owner_user_id', user.id)
      if (id) query = query.eq('id', id)

      const { data, error } = await query.order('created_at', { ascending: false }).limit(id ? 1 : 50)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (id) {
        const seller = data?.[0]
        if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
        return NextResponse.json({ seller })
      }
      return NextResponse.json({ sellers: data || [], seller: data?.[0] || null })
    }

    const { data, error } = await admin
      .from('sellers')
      .select(PUBLIC_SELLER_FIELDS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sellers: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    if ('owner_id' in body || 'owner_user_id' in body || 'status' in body || 'verification_status' in body) {
      return NextResponse.json({ error: 'Owner and moderation fields are server-controlled' }, { status: 403 })
    }
    const {
      business_name,
      seller_type,
      description,
      location_text,
      address,
      latitude,
      longitude,
      phone,
      hours_text,
      pickup_available,
      delivery_available,
      ordering_method,
      ordering_url,
      logo_url,
    } = body

    if (!business_name || !seller_type) {
      return NextResponse.json({ error: 'business_name and seller_type are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // V1: one seller per owner
    const { data: existing, error: findError } = await admin
      .from('sellers')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (existing) return NextResponse.json({ seller: existing }, { status: 200 })

    const insert: any = {
      owner_user_id: user.id,
      business_name,
      seller_type,
      description: description || null,
      location_text: location_text || null,
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      phone: phone || null,
      hours_text: hours_text || null,
      pickup_available: !!pickup_available,
      delivery_available: !!delivery_available,
      ordering_method: ordering_method || 'none',
      ordering_url: ordering_url || null,
      logo_url: logo_url || null,
      status: 'pending_review',
      verification_status: 'pending',
    }

    const { data, error } = await admin
      .from('sellers')
      .insert(insert)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ seller: data }, { status: 201 })
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
    if ('owner_id' in body || 'owner_user_id' in body || 'status' in body || 'verification_status' in body || 'suspension_reason' in body) {
      return NextResponse.json({ error: 'Owner and moderation fields are admin-controlled' }, { status: 403 })
    }
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const allowed = [
      'business_name', 'seller_type', 'description', 'logo_url', 'location_text', 'address',
      'latitude', 'longitude', 'phone', 'hours_text', 'pickup_available', 'delivery_available',
      'ordering_method', 'ordering_url', 'service_area'
    ]
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('sellers')
      .update(update)
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .select()
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    return NextResponse.json({ seller: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
