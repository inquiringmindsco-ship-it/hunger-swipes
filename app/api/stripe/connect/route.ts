import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { getStripe, assertTestMode } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    assertTestMode()

    const body = await request.json()
    const { seller_id } = body
    if (!seller_id) return NextResponse.json({ error: 'seller_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error } = await admin
      .from('sellers')
      .select('*')
      .eq('id', seller_id)
      .eq('owner_user_id', user.id)
      .single()
    if (error || !seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    let accountId = seller.stripe_account_id
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { seller_id: seller.id, business_name: seller.business_name || '' },
      }, { idempotencyKey: `seller-connect-${seller.id}` })
      accountId = account.id
      await admin.from('sellers').update({
        stripe_account_id: accountId,
        stripe_connect_status: 'onboarding_incomplete',
        stripe_connect_details: { account_id: accountId },
      }).eq('id', seller.id)
    }

    const refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hungerswipes.com'}/seller/dashboard?stripe=refresh`
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hungerswipes.com'}/seller/dashboard?stripe=success`

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, stripe_account_id: accountId, status: 'onboarding_incomplete' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const seller_id = searchParams.get('seller_id')
    if (!seller_id) return NextResponse.json({ error: 'seller_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller } = await admin
      .from('sellers')
      .select('id, stripe_account_id, stripe_connect_status, stripe_connect_details')
      .eq('id', seller_id)
      .eq('owner_user_id', user.id)
      .single()
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    // Optionally refresh status from Stripe if account exists
    const stripe = getStripe()
    if (stripe && seller.stripe_account_id) {
      try {
        assertTestMode()
        const account = await stripe.accounts.retrieve(seller.stripe_account_id)
        const status = account.charges_enabled && account.payouts_enabled
          ? 'ready'
          : account.details_submitted
            ? 'restricted'
            : 'onboarding_incomplete'
        const details = {
          ...seller.stripe_connect_details,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        }
        if (status !== seller.stripe_connect_status || JSON.stringify(details) !== JSON.stringify(seller.stripe_connect_details)) {
          await admin.from('sellers').update({
            stripe_connect_status: status,
            stripe_connect_details: details,
          }).eq('id', seller.id)
          seller.stripe_connect_status = status
          seller.stripe_connect_details = details
        }
      } catch {
        // leave cached status if Stripe call fails
      }
    }

    return NextResponse.json({
      seller_id: seller.id,
      stripe_account_id: seller.stripe_account_id,
      status: seller.stripe_connect_status,
      details: seller.stripe_connect_details,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
