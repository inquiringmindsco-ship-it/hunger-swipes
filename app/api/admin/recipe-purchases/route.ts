import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assertTestMode, getStripe } from '@/lib/stripe'
import { checkAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 200)

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('recipe_purchases')
      .select('*, recipe:recipes(title, dish_id), seller:sellers(business_name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ purchases: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { purchase_id, reason } = body
    if (!purchase_id) return NextResponse.json({ error: 'purchase_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: purchase } = await admin.from('recipe_purchases')
      .select('id, status, refund_status, payment_intent_id')
      .eq('id', purchase_id)
      .maybeSingle()
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    if (purchase.status !== 'succeeded' || !purchase.payment_intent_id) {
      return NextResponse.json({ error: 'Only succeeded Stripe purchases can be refunded' }, { status: 409 })
    }
    if (purchase.refund_status === 'pending' || purchase.refund_status === 'succeeded') {
      return NextResponse.json({ error: 'Refund already requested' }, { status: 409 })
    }

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    assertTestMode()

    await admin.from('recipe_purchases').update({
      refund_status: 'pending',
      refund_reason: reason || 'Admin refund',
    }).eq('id', purchase.id)

    try {
      const refund = await stripe.refunds.create({
        payment_intent: purchase.payment_intent_id,
        reverse_transfer: true,
        refund_application_fee: true,
        reason: 'requested_by_customer',
        metadata: { purchase_id: purchase.id },
      }, { idempotencyKey: `recipe-refund-${purchase.id}` })
      return NextResponse.json({ success: true, refund_id: refund.id, status: refund.status })
    } catch (error: any) {
      await admin.from('recipe_purchases').update({
        refund_status: 'failed',
        refund_reason: error?.message || 'Stripe refund failed',
      }).eq('id', purchase.id)
      throw error
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
