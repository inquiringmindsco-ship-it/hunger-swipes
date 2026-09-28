import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const ownerType = searchParams.get('owner_type') || 'user'
    const ownerId = searchParams.get('owner_id') || user.id

    if (ownerType === 'user' && ownerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (ownerType === 'seller') {
      const admin = getSupabaseAdmin()
      if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
      const { data: seller } = await admin.from('sellers').select('id').eq('id', ownerId).eq('owner_user_id', user.id).maybeSingle()
      if (!seller) return NextResponse.json({ error: 'Seller not found or not yours' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: profile } = await admin
      .from('food_profiles')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .maybeSingle()
    return NextResponse.json({ profile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { owner_type, owner_id } = body
    const ownerType = owner_type || 'user'
    const ownerId = owner_id || user.id

    if (ownerType === 'user' && ownerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (ownerType === 'seller') {
      const admin = getSupabaseAdmin()
      if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
      const { data: seller } = await admin.from('sellers').select('id').eq('id', ownerId).eq('owner_user_id', user.id).maybeSingle()
      if (!seller) return NextResponse.json({ error: 'Seller not found or not yours' }, { status: 403 })
    }

    const allowed = ['bio', 'website_url', 'instagram_handle', 'tiktok_handle', 'youtube_url', 'featured_dish_id', 'profile_photo_url', 'is_public']
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('food_profiles')
      .upsert({ owner_type: ownerType, owner_id: ownerId, ...update }, { onConflict: 'owner_type,owner_id' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
