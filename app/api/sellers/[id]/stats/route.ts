import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: dishes, error } = await admin
      .from('dishes')
      .select('impressions, right_swipes, left_swipes, order_clicks')
      .eq('seller_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const stats = (dishes || []).reduce((acc, d) => {
      acc.impressions += d.impressions || 0
      acc.rightSwipes += d.right_swipes || 0
      acc.leftSwipes += d.left_swipes || 0
      acc.orderClicks += d.order_clicks || 0
      return acc
    }, { impressions: 0, rightSwipes: 0, leftSwipes: 0, orderClicks: 0, rightSwipeRate: 0, dishCount: dishes?.length || 0 })

    const total = stats.rightSwipes + stats.leftSwipes
    stats.rightSwipeRate = total > 0 ? Math.round((stats.rightSwipes / total) * 100) : 0

    return NextResponse.json({ stats })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
