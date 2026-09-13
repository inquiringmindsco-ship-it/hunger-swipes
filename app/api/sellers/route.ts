import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (id) {
      const { data, error } = await admin
        .from('sellers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json({ seller: data })
    }

    const { data, error } = await admin
      .from('sellers')
      .select('*')
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
    const {
      owner_id,
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

    const insert: any = {
      owner_id,
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
      status: 'active',
    }

    // Auto-approve non-home-kitchen for V1 simplicity; home kitchens remain pending until reviewed
    insert.verification_status = seller_type === 'home_kitchen' ? 'pending' : 'approved'
    if (seller_type === 'home_kitchen') {
      insert.status = 'pending_review'
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
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const allowed = [
      'business_name', 'seller_type', 'description', 'logo_url', 'location_text', 'address',
      'latitude', 'longitude', 'phone', 'hours_text', 'pickup_available', 'delivery_available',
      'ordering_method', 'ordering_url', 'status', 'verification_status', 'suspension_reason'
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
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ seller: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
