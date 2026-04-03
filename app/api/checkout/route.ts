import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Lazy init so build doesn't fail without the key
let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripe
}

export async function POST(request: NextRequest) {
  try {
    const { creatorId, promotion, amount, photoId } = await request.json()

    const promotions: Record<string, { name: string; price: number; description: string }> = {
      featured: { name: 'Featured Photo', price: 999, description: '24hr featuring on Swipe feed' },
      trending: { name: 'Trending Push', price: 2499, description: '7 days trending badge + top placement' },
      champion: { name: 'Champion Spotlight', price: 4999, description: '7 days leaderboard top spot + social push' },
    }

    const promo = promotions[promotion]
    if (!promo) {
      return NextResponse.json({ error: 'Invalid promotion type' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hunger-swipes.vercel.app'

    const stripeClient = getStripe()
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `HungerSwipes: ${promo.name}`,
              description: promo.description,
            },
            unit_amount: promo.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/creator?payment=success&promo=${promotion}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/creator?payment=cancelled`,
      metadata: {
        creatorId,
        promotion,
        photoId: photoId || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    if (error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json({ error: 'Stripe not configured yet — contact support' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
