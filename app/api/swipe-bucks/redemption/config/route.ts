import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    const { data, error } = await admin
      .from('swipe_bucks_config')
      .select('redemption_enabled, daily_redemption_cap_cents, monthly_redemption_cap_cents, max_redemption_per_transaction_cents, global_monthly_redemption_budget_cents')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

    const allowed = [
      'redemption_enabled',
      'daily_redemption_cap_cents',
      'monthly_redemption_cap_cents',
      'max_redemption_per_transaction_cents',
      'global_monthly_redemption_budget_cents',
    ]
    const update: any = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (Object.keys(update).length === 1) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    const { data, error } = await admin.from('swipe_bucks_config').update(update).eq('id', 1).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
