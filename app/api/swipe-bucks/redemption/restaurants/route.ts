import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  return secret === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    const { data, error } = await admin
      .from('swipe_bucks_restaurant_limits')
      .select('*, restaurant:places(id, name)')
      .order('updated_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ restaurants: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { restaurant_id, redemption_enabled, monthly_redemption_allowance_cents, reimbursement_cents, promotional_contribution_cents } = body
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

    const update: any = { restaurant_id, updated_at: new Date().toISOString() }
    if (redemption_enabled !== undefined) update.redemption_enabled = redemption_enabled
    if (monthly_redemption_allowance_cents !== undefined) update.monthly_redemption_allowance_cents = monthly_redemption_allowance_cents
    if (reimbursement_cents !== undefined) update.reimbursement_cents = reimbursement_cents
    if (promotional_contribution_cents !== undefined) update.promotional_contribution_cents = promotional_contribution_cents

    const { data, error } = await admin
      .from('swipe_bucks_restaurant_limits')
      .upsert(update, { onConflict: 'restaurant_id' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ restaurant: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
