import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { checkAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const adminUser = await getRequestUser(request)
    const body = await request.json()
    const { action, user_id, restaurant_id, reason, new_value, new_status } = body

    if (!action || !reason?.trim()) {
      return NextResponse.json({ error: 'action and reason are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

    let previousValue: string | null = null
    let previousStatus: string | null = null
    let newValue: string | null = new_value || null

    if (action === 'release_hold' || action === 'disable_user' || action === 'enable_user') {
      if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
      const { data: wallet } = await admin.from('swipe_bucks_wallets').select('redemption_status, restricted_cents, held_cents').eq('user_id', user_id).single()
      previousStatus = wallet?.redemption_status || 'eligible'
      const nextStatus = action === 'release_hold' ? 'eligible' : action === 'disable_user' ? 'restricted' : 'eligible'
      const { error } = await admin.from('swipe_bucks_wallets').update({ redemption_status: nextStatus, updated_at: new Date().toISOString() }).eq('user_id', user_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      newValue = nextStatus
    }

    if (action === 'disable_restaurant' || action === 'enable_restaurant') {
      if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })
      const { data: limit } = await admin.from('swipe_bucks_restaurant_limits').select('redemption_enabled').eq('restaurant_id', restaurant_id).single()
      previousValue = limit?.redemption_enabled?.toString() || 'false'
      const nextEnabled = action === 'enable_restaurant'
      const { error } = await admin.from('swipe_bucks_restaurant_limits')
        .upsert({ restaurant_id, redemption_enabled: nextEnabled, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      newValue = nextEnabled.toString()
    }

    if (action === 'enable_redemption' || action === 'disable_redemption') {
      const { data: config } = await admin.from('swipe_bucks_config').select('redemption_enabled').single()
      previousValue = config?.redemption_enabled?.toString() || 'false'
      const nextEnabled = action === 'enable_redemption'
      const { error } = await admin.from('swipe_bucks_config').update({ redemption_enabled: nextEnabled, updated_at: new Date().toISOString() }).eq('id', 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      newValue = nextEnabled.toString()
    }

    if (action === 'change_cap') {
      if (!new_value || !new_value.field) return NextResponse.json({ error: 'new_value.field required' }, { status: 400 })
      const { data: config } = await admin.from('swipe_bucks_config').select(new_value.field).single()
      previousValue = config?.[new_value.field]?.toString() || '0'
      const { error } = await admin.from('swipe_bucks_config').update({ [new_value.field]: new_value.value, updated_at: new Date().toISOString() }).eq('id', 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      newValue = new_value.value.toString()
    }

    const { data: override, error: overrideError } = await admin.from('swipe_bucks_redemption_overrides').insert({
      user_id: user_id || null,
      restaurant_id: restaurant_id || null,
      admin_user_id: adminUser?.id || null,
      action,
      previous_value: previousValue,
      new_value: newValue,
      previous_status: previousStatus,
      new_status: new_status || (action === 'release_hold' || action === 'disable_user' ? newValue : null),
      reason: reason.trim(),
    }).select().single()

    if (overrideError) return NextResponse.json({ error: overrideError.message }, { status: 500 })

    return NextResponse.json({ override })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
