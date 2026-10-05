import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { hashStaffPin } from '@/lib/staff-auth'
import { checkAdmin } from '@/lib/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const pin = typeof body.pin === 'string' && body.pin.trim() ? body.pin.trim() : null

    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: 'PIN must be at least 4 characters' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const hash = await hashStaffPin(pin)
    const { data, error } = await admin
      .from('sellers')
      .update({ staff_pin_hash: hash, staff_pin_updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, slug, business_name')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    return NextResponse.json({ ok: true, slug: data.slug, business_name: data.business_name }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
