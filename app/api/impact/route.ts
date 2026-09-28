import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

const ALLOWED_EVENT_TYPES = new Set([
  'right_swipe','save','recipe_view','recipe_unlock','recipe_purchase_intent',
  'order_intent','creator_engagement','repeat_interest','follow'
])

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { event_type, dish_id, recipe_id, seller_id, community_post_id, metadata } = body

    if (!ALLOWED_EVENT_TYPES.has(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin.rpc('record_food_impact_event', {
      p_actor_id: user.id,
      p_event_type: event_type,
      p_dish_id: dish_id || null,
      p_recipe_id: recipe_id || null,
      p_seller_id: seller_id || null,
      p_community_post_id: community_post_id || null,
      p_metadata: metadata || {},
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ event: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
