import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { hashStaffPin } from '@/lib/staff-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error } = await admin
      .from('sellers')
      .select('staff_pin_hash, staff_pin_updated_at')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      hasPin: Boolean(seller?.staff_pin_hash),
      updatedAt: seller?.staff_pin_updated_at || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error: findError } = await admin
      .from('sellers')
      .select('id, slug, owner_user_id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    // 6-digit numeric PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    const hash = await hashStaffPin(pin)

    const { error: updateError } = await admin
      .from('sellers')
      .update({ staff_pin_hash: hash, staff_pin_updated_at: new Date().toISOString() })
      .eq('id', seller.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ pin, slug: seller.slug }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
