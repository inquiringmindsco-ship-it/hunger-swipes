import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { checkAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const adminUser = await getRequestUser(request)
    const body = await request.json()
    const { user_id, amount_cents, type, reason, post_id, dish_id, restaurant_id } = body

    if (!user_id || !amount_cents || !['credit', 'reversal'].includes(type) || !reason?.trim()) {
      return NextResponse.json({ error: 'user_id, amount_cents, type (credit|reversal), and reason are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

    const now = new Date().toISOString()
    const { data: walletRow } = await admin.from('swipe_bucks_wallets').select('balance_cents,lifetime_earned_cents,lifetime_redeemed_cents').eq('user_id', user_id).maybeSingle()
    const balance = walletRow?.balance_cents ?? 0

    if (type === 'reversal' && balance < amount_cents) {
      return NextResponse.json({ error: 'Insufficient balance for reversal' }, { status: 400 })
    }

    const eventType = type === 'credit' ? 'manual_credit' : 'manual_reversal'
    const signedAmount = type === 'credit' ? amount_cents : -amount_cents

    const { data: ledger, error: ledgerError } = await admin
      .from('swipe_bucks_ledger')
      .insert({
        user_id,
        amount_cents: signedAmount,
        type,
        status: 'credited',
        event_type: eventType,
        post_id: post_id || null,
        dish_id: dish_id || null,
        restaurant_id: restaurant_id || null,
        reason: reason.trim(),
        admin_user_id: adminUser?.id || null,
        processed_at: now,
      })
      .select()
      .single()

    if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 })

    const { error: walletError } = await admin
      .from('swipe_bucks_wallets')
      .upsert({
        user_id,
        balance_cents: balance + signedAmount,
        lifetime_earned_cents: type === 'credit' ? (walletRow?.lifetime_earned_cents ?? 0) + amount_cents : (walletRow?.lifetime_earned_cents ?? 0),
        lifetime_redeemed_cents: type === 'reversal' ? (walletRow?.lifetime_redeemed_cents ?? 0) + amount_cents : (walletRow?.lifetime_redeemed_cents ?? 0),
        pending_cents: 0,
        updated_at: now,
      }, { onConflict: 'user_id' })

    if (walletError) return NextResponse.json({ error: walletError.message }, { status: 500 })

    return NextResponse.json({ ledger })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
