import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

    const { data: walletRow } = await admin
      .from('swipe_bucks_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const wallet = walletRow || {
      user_id: user.id,
      balance_cents: 0,
      lifetime_earned_cents: 0,
      lifetime_redeemed_cents: 0,
      pending_cents: 0,
      available_to_redeem_cents: 0,
      held_cents: 0,
      restricted_cents: 0,
      redemption_status: 'eligible',
      risk_flags: [],
    }

    const { data: ledger } = await admin
      .from('swipe_bucks_ledger')
      .select('*, post:community_food_posts(id, dish_name, place:places(id, name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: posts } = await admin
      .from('community_food_posts')
      .select('id, impressions, right_swipes, left_swipes, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('moderation_status', 'approved')

    const postIds = (posts || []).map((p: any) => p.id)
    let savesGenerated = 0
    if (postIds.length > 0) {
      const { data: savesRows } = await admin
        .from('saved_food')
        .select('content_id')
        .eq('content_kind', 'community')
        .in('content_id', postIds)
      savesGenerated = savesRows?.length ?? 0
    }

    const { data: eligibility } = await admin.rpc('swipe_bucks_check_redemption', {
      p_user_id: user.id,
      p_amount_cents: 0,
      p_restaurant_id: null,
    })

    const impact = {
      dishes_posted: (posts || []).length,
      people_reached: (posts || []).reduce((sum: number, p: any) => sum + (p.impressions || 0), 0),
      right_swipes_generated: (posts || []).reduce((sum: number, p: any) => sum + (p.right_swipes || 0), 0),
      saves_generated: savesGenerated,
      clicks_generated: 0,
      verified_meals_generated: 0,
      swipe_bucks_earned_cents: wallet.lifetime_earned_cents,
      redemption_eligible: eligibility?.eligible ?? false,
      redemption_reasons: eligibility?.reasons ?? ['Swipe Bucks redemption is not enabled'],
    }

    return NextResponse.json({
      wallet,
      ledger: ledger || [],
      impact,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
