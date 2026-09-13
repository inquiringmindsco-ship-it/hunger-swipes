import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eaterId, dishId, direction } = body
    if (!eaterId || !dishId || !['left', 'right'].includes(direction)) {
      return NextResponse.json({ error: 'eaterId, dishId, and direction (left|right) required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    // Read current dish stats and previous swipe direction
    const [{ data: dish, error: dishError }, { data: previousSwipe }] = await Promise.all([
      admin
        .from('dishes')
        .select('id, impressions, right_swipes, left_swipes, seller:sellers!inner(id)')
        .eq('id', dishId)
        .eq('status', 'active')
        .eq('availability', 'available')
        .eq('sellers.status', 'active')
        .not('photo_url', 'is', null)
        .neq('photo_url', '')
        .single(),
      admin.from('swipes').select('direction').eq('eater_id', eaterId).eq('dish_id', dishId).maybeSingle(),
    ])
    if (dishError || !dish) return NextResponse.json({ error: 'Active dish not found' }, { status: 404 })

    const isRight = direction === 'right'
    const wasRight = previousSwipe?.direction === 'right'
    const wasLeft = previousSwipe?.direction === 'left'

    // Upsert swipe
    const { error: swipeError } = await admin
      .from('swipes')
      .upsert({ eater_id: eaterId, dish_id: dishId, direction }, { onConflict: 'eater_id, dish_id' })
    if (swipeError) return NextResponse.json({ error: swipeError.message }, { status: 500 })

    // Update counters
    let rightDelta = 0
    let leftDelta = 0
    if (isRight) {
      rightDelta = wasRight ? 0 : 1
      if (wasLeft) leftDelta = -1
    } else {
      leftDelta = wasLeft ? 0 : 1
      if (wasRight) rightDelta = -1
    }

    const { error: updateError } = await admin.from('dishes').update({
      impressions: (dish.impressions || 0) + 1,
      right_swipes: Math.max(0, (dish.right_swipes || 0) + rightDelta),
      left_swipes: Math.max(0, (dish.left_swipes || 0) + leftDelta),
    }).eq('id', dishId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Save or remove saved dish
    if (isRight) {
      await admin.from('saved_dishes').upsert({ eater_id: eaterId, dish_id: dishId }, { onConflict: 'eater_id, dish_id' })
    } else {
      await admin.from('saved_dishes').delete().eq('eater_id', eaterId).eq('dish_id', dishId)
    }

    return NextResponse.json({ success: true, saved: isRight })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
