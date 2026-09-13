import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('dishes')
      .select('*, seller:sellers!inner(owner_user_id)')
      .eq('seller_id', id)
      .eq('sellers.owner_user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dishes: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const {
      name,
      description,
      photo_url,
      price,
      availability,
      category,
      tags,
      status,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'dish name is required' }, { status: 400 })
    }
    if ((status || 'active') === 'active' && !photo_url?.trim()) {
      return NextResponse.json({ error: 'A real dish photo is required before publishing' }, { status: 400 })
    }
    if (status && !['draft', 'active'].includes(status)) {
      return NextResponse.json({ error: 'Invalid seller-managed dish status' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    // Verify seller exists
    const { data: seller, error: sellerError } = await admin
      .from('sellers')
      .select('id')
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .maybeSingle()
    if (sellerError || !seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    const { data, error } = await admin
      .from('dishes')
      .insert({
        seller_id: id,
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
