import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { getStripe, assertTestMode, getRecipeCommerceConfig, computeRecipeEcon } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { recipe_id, proud_to_pay_amount } = body
    if (!recipe_id) return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    assertTestMode()

    const { data: recipe, error: recipeError } = await admin
      .from('recipes')
      .select('id, dish_id, seller_id, title, price, recipe_type, min_proud_to_pay_amount, status, published, seller:sellers!inner(stripe_account_id, stripe_connect_status, owner_user_id)')
      .eq('id', recipe_id)
      .maybeSingle()
    if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })
    if (!recipe || recipe.status !== 'active' || !recipe.published) {
      return NextResponse.json({ error: 'Recipe not available for purchase' }, { status: 404 })
    }

    const sellerRow = recipe.seller as any
    if (recipe.recipe_type !== 'free' && sellerRow?.stripe_connect_status !== 'ready') {
      return NextResponse.json({ error: 'Creator is not ready to accept payments' }, { status: 400 })
    }

    // Determine price in cents
    let priceCents = Math.round(Number(recipe.price) * 100)
    if (recipe.recipe_type === 'free') {
      return NextResponse.json({ error: 'This recipe is free; use unlock instead' }, { status: 400 })
    }
    if (recipe.recipe_type === 'proud_to_pay') {
      const min = Math.round(Number(recipe.min_proud_to_pay_amount || 5) * 100)
      const offered = Math.round(Number(proud_to_pay_amount) * 100)
      if (isNaN(offered) || offered < min) {
        return NextResponse.json({ error: `Proud to Pay amount must be at least $${(min / 100).toFixed(2)}` }, { status: 400 })
      }
      priceCents = offered
    }

    // Server-side authoritative economics from centralized config
    const commerceConfig = await getRecipeCommerceConfig(admin)
    if (commerceConfig.testModeOnly) assertTestMode()
    const { platformFeeCents, creatorPayoutCents, platformFeePercent, creatorSharePercent } = computeRecipeEcon(priceCents, commerceConfig.platformFeePercent)

    // Check existing active entitlement
    const { data: existingEntitlement } = await admin
      .from('recipe_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .eq('status', 'active')
      .maybeSingle()
    if (existingEntitlement) {
      return NextResponse.json({ error: 'You already own this recipe' }, { status: 409 })
    }

    // Record pending purchase intent
    const { data: purchase, error: purchaseError } = await admin
      .from('recipe_purchases')
      .insert({
        user_id: user.id,
        recipe_id: recipe_id,
        dish_id: recipe.dish_id,
        price_cents: priceCents,
        platform_fee_cents: platformFeeCents,
        creator_payout_cents: creatorPayoutCents,
        tax_cents: 0,
        currency: 'usd',
        status: 'pending',
        recipe_type: recipe.recipe_type,
        proud_to_pay_amount: recipe.recipe_type === 'proud_to_pay' ? priceCents / 100 : null,
      })
      .select()
      .single()
    if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })

    // Create Stripe PaymentIntent with Connect transfer
    const applicationFeeAmount = platformFeeCents
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceCents,
      currency: 'usd',
      application_fee_amount: applicationFeeAmount,
      transfer_data: sellerRow?.stripe_account_id
        ? { destination: sellerRow.stripe_account_id }
        : undefined,
      metadata: {
        recipe_id: recipe_id,
        user_id: user.id,
        seller_id: recipe.seller_id,
        purchase_id: purchase.id,
        recipe_type: recipe.recipe_type,
        platform_fee_cents: String(platformFeeCents),
        creator_payout_cents: String(creatorPayoutCents),
      },
      automatic_payment_methods: { enabled: true },
    })

    await admin.from('recipe_purchases').update({
      payment_processor: 'stripe',
      payment_intent_id: paymentIntent.id,
    }).eq('id', purchase.id)

    return NextResponse.json({
      purchase,
      client_secret: paymentIntent.client_secret,
      recipe: {
        id: recipe.id,
        title: recipe.title,
        price: priceCents / 100,
        recipe_type: recipe.recipe_type,
      },
      economics: {
        platform_fee_cents: platformFeeCents,
        creator_payout_cents: creatorPayoutCents,
        platform_fee_percent: platformFeePercent,
        creator_share_percent: creatorSharePercent,
      },
      status: 'requires_payment',
      message: 'Payment intent created. Complete payment via Stripe. Webhook will unlock recipe.',
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
