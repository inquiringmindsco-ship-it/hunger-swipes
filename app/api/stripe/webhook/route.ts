import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getStripe, getWebhookSecret } from '@/lib/stripe'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'

async function getRawBody(request: NextRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  const reader = request.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = getWebhookSecret()
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
  }

  const payload = await getRawBody(request)
  const signature = request.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { recipe_id, user_id, purchase_id, seller_id } = pi.metadata || {}
    if (!purchase_id || !recipe_id || !user_id) {
      return NextResponse.json({ received: true, note: 'Missing metadata' })
    }

    // Idempotency: only succeed if pending
    const { data: purchase } = await admin
      .from('recipe_purchases')
      .select('id, status, recipe_id, user_id, dish_id')
      .eq('id', purchase_id)
      .maybeSingle()
    if (!purchase || purchase.status !== 'pending') {
      return NextResponse.json({ received: true, note: 'Purchase not pending or not found' })
    }

    // Authoritative values from Stripe metadata + DB
    await admin.rpc('settle_recipe_purchase', {
      purchase_id: purchase.id,
      processor: 'stripe',
      intent_id: pi.id,
      succeeded: true,
      failure: null,
    })

    await admin.rpc('record_food_impact_event', {
      p_actor_id: user_id,
      p_event_type: 'recipe_purchase',
      p_dish_id: purchase.dish_id,
      p_recipe_id: purchase.recipe_id,
      p_seller_id: seller_id || null,
      p_metadata: { purchase_id: purchase.id, payment_intent_id: pi.id, amount_cents: pi.amount },
    })
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { purchase_id, user_id, recipe_id, seller_id } = pi.metadata || {}
    if (!purchase_id) return NextResponse.json({ received: true, note: 'Missing metadata' })

    await admin.from('recipe_purchases').update({
      status: 'failed',
      failure_reason: pi.last_payment_error?.message || 'Payment failed',
    }).eq('id', purchase_id).eq('status', 'pending')

    await admin.rpc('record_food_impact_event', {
      p_actor_id: user_id,
      p_event_type: 'recipe_purchase_failed',
      p_recipe_id: recipe_id || null,
      p_seller_id: seller_id || null,
      p_metadata: { purchase_id, payment_intent_id: pi.id },
    })
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
    if (!piId) return NextResponse.json({ received: true, note: 'No payment intent' })

    const { data: purchase } = await admin
      .from('recipe_purchases')
      .select('id')
      .eq('payment_intent_id', piId)
      .maybeSingle()
    if (purchase) {
      await admin.rpc('refund_recipe_purchase', {
        purchase_id: purchase.id,
        refund_reason: 'Stripe charge.refunded',
      })
    }
  }

  return NextResponse.json({ received: true })
}
