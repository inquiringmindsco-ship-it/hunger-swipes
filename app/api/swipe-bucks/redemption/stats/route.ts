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

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const { data: config } = await admin
      .from('swipe_bucks_config')
      .select('global_monthly_redemption_budget_cents, monthly_redemption_cap_cents, redemption_enabled')
      .single()

    const [
      { data: redeemedThisMonth },
      { data: userWallets },
      { data: restrictedUsers },
      { data: nearCapUsers },
      { data: redemptions },
    ] = await Promise.all([
      admin.rpc('swipe_bucks_global_redeemed_this_month'),
      admin.from('swipe_bucks_wallets').select('user_id, balance_cents, available_to_redeem_cents, held_cents, restricted_cents, redemption_status, risk_flags'),
      admin.from('swipe_bucks_wallets').select('user_id, redemption_status, restricted_cents, risk_flags').in('redemption_status', ['review', 'restricted']),
      admin.from('swipe_bucks_wallets').select('user_id, lifetime_redeemed_cents').gte('lifetime_redeemed_cents', (config?.monthly_redemption_cap_cents || 0) * 0.8),
      admin.from('swipe_bucks_redemptions').select('restaurant_id, amount_cents').eq('status', 'approved').gte('created_at', monthStart).not('restaurant_id', 'is', null),
    ])

    const totals: Record<string, number> = {}
    for (const r of redemptions || []) {
      if (!r.restaurant_id) continue
      totals[r.restaurant_id] = (totals[r.restaurant_id] || 0) + (r.amount_cents || 0)
    }
    const restaurantTotals = Object.entries(totals).map(([restaurant_id, sum]) => ({ restaurant_id, sum }))

    const totalOutstanding = (userWallets || []).reduce((s: number, w: any) => s + (w.balance_cents || 0), 0)
    const totalRestricted = (userWallets || []).reduce((s: number, w: any) => s + (w.restricted_cents || 0), 0)
    const totalHeld = (userWallets || []).reduce((s: number, w: any) => s + (w.held_cents || 0), 0)

    return NextResponse.json({
      redemption_enabled: config?.redemption_enabled ?? false,
      global_monthly_budget_cents: config?.global_monthly_redemption_budget_cents ?? 0,
      global_redeemed_this_month_cents: redeemedThisMonth || 0,
      global_remaining_cents: Math.max(0, (config?.global_monthly_redemption_budget_cents || 0) - (redeemedThisMonth || 0)),
      outstanding_cents: totalOutstanding,
      restricted_cents: totalRestricted,
      held_cents: totalHeld,
      restricted_users: restrictedUsers || [],
      near_cap_users: nearCapUsers || [],
      restaurant_totals: restaurantTotals,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
