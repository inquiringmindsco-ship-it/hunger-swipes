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
    }

    const { data: ledger } = await admin
      .from('swipe_bucks_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: posts } = await admin
      .from('community_food_posts')
      .select('id, impressions, right_swipes, left_swipes, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')

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

    const impact = {
      dishes_posted: (posts || []).length,
      people_reached: (posts || []).reduce((sum: number, p: any) => sum + (p.impressions || 0), 0),
      right_swipes_generated: (posts || []).reduce((sum: number, p: any) => sum + (p.right_swipes || 0), 0),
      saves_generated: savesGenerated,
      clicks_generated: 0, // Not reliably tracked yet.
      verified_meals_generated: 0, // Order attribution not built yet.
      swipe_bucks_earned_cents: wallet.lifetime_earned_cents,
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
