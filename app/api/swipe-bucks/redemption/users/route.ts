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

    const { data: wallets, error } = await admin
      .from('swipe_bucks_wallets')
      .select('user_id, balance_cents, available_to_redeem_cents, held_cents, restricted_cents, redemption_status, risk_flags, lifetime_redeemed_cents')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: wallets })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
