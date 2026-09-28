import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

// Hunger Swipes recipe purchase architecture.
// This endpoint records a purchase INTENT. It does NOT collect real money
// and does NOT activate an entitlement. Real payment settlement (Stripe,
// etc.) should call settle_recipe_purchase() after confirming funds.
//
// Remaining work to activate payments:
//  1. Choose/configure payment processor (Stripe/PayPal/etc).
//  2. Create payment intent/session from processor and return client secret here.
//  3. Webhook handler confirms payment, then calls settle_recipe_purchase().
//  4. Define platform fee %, creator payout %, tax rules, refund policy.
//  5. Payout mechanics to creator bank account.

function computeEcon(priceCents: number) {
  // Placeholder economics. DO NOT invent permanent percentages in this task.
  // These are explicitly architecture defaults; Od must approve real values.
  const platformFeeCents = 0
  const creatorPayoutCents = priceCents
  const taxCents = 0
  return { platformFeeCents, creatorPayoutCents, taxCents }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { recipe_id } = body
    if (!recipe_id) return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    // Validate recipe is available for purchase.
    const { data: recipe, error: recipeError } = await admin
      .from('recipes')
      .select('id, dish_id, seller_id, title, price, status, published')
      .eq('id', recipe_id)
      .maybeSingle()
    if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })
    if (!recipe || recipe.status !== 'active' || !recipe.published) {
      return NextResponse.json({ error: 'Recipe not available for purchase' }, { status: 404 })
    }
    if (recipe.price <= 0) {
      return NextResponse.json({ error: 'This recipe is free; use unlock instead of purchase' }, { status: 400 })
    }

    // Check existing active entitlement.
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

    const priceCents = Math.round(recipe.price * 100)
    const { platformFeeCents, creatorPayoutCents, taxCents } = computeEcon(priceCents)

    // Record a pending purchase intent. No money is collected.
    const { data: purchase, error: purchaseError } = await admin
      .from('recipe_purchases')
      .insert({
        user_id: user.id,
        recipe_id: recipe_id,
        dish_id: recipe.dish_id,
        price_cents: priceCents,
        platform_fee_cents: platformFeeCents,
        creator_payout_cents: creatorPayoutCents,
        tax_cents: taxCents,
        currency: 'usd',
        status: 'pending',
      })
      .select()
      .single()
    if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })

    return NextResponse.json({
      purchase,
      recipe: {
        id: recipe.id,
        title: recipe.title,
        price: recipe.price,
      },
      status: 'pending_payment',
      message: 'Purchase intent recorded. Payment not yet activated.',
      architecture: {
        platform_fee_cents: platformFeeCents,
        creator_payout_cents: creatorPayoutCents,
        tax_cents: taxCents,
        settlement_function: 'public.settle_recipe_purchase(purchase_id, processor, intent_id, succeeded, failure)',
      },
      remaining_for_activation: [
        'Configure payment processor (Stripe recommended).',
        'Create payment intent in this endpoint and return client_secret.',
        'Add webhook route to confirm payment and call settle_recipe_purchase().',
        'Od approves platform fee %, creator payout %, and tax handling.',
        'Implement creator payout mechanics and refund policy.',
      ],
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
