import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/recipes/purchase - Purchase a recipe
export async function POST(request: NextRequest) {
  try {
    const { recipeId, buyerId } = await request.json()

    if (!recipeId || !buyerId) {
      return NextResponse.json(
        { error: 'Missing required fields: recipeId, buyerId' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      const mockPurchase = {
        id: 'mock-purchase-' + Date.now(),
        recipe_id: recipeId,
        buyer_id: buyerId,
        amount_paid: 4.99,
        creator_earnings: 4.49, // 90% to creator
        platform_fee: 0.50, // 10% platform
        created_at: new Date().toISOString(),
        mock: true
      }
      
      // Return full recipe
      const mockRecipe = {
        id: recipeId,
        recipe_title: 'Perfect Smoked Brisket',
        ingredients: ['12lb brisket', 'BBQ rub', 'Mustard binder', 'Beef tallow', 'Worcestershire sauce'],
        steps: [
          'Trim the brisket of excess fat, leaving about 1/4 inch of fat cap.',
          'Apply mustard binder evenly across the meat.',
          'Season generously with your BBQ rub, pressing into the meat.',
          'Let the seasoned brisket rest at room temperature for 1 hour.',
          'Preheat your smoker to 225°F (107°C) with oak or hickory wood.',
          'Place brisket fat-side up on the smoker grates.',
          'Smoke until internal temp reaches 165°F (about 4-6 hours).',
          'Wrap in butcher paper and continue smoking until 203°F internal.',
          'Rest wrapped for at least 1 hour before slicing against the grain.',
          'Slice to 1/4 inch thickness and serve with the rendered fat drippings.'
        ],
        prep_time_minutes: 30,
        cook_time_minutes: 720,
        price: 4.99,
        mock: true
      }
      
      return NextResponse.json({ 
        purchase: mockPurchase,
        recipe: mockRecipe,
        mock: true 
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get recipe details
    const { data: recipe, error: recipeError } = await (supabase as any)
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (recipe.price === 0) {
      return NextResponse.json({ error: 'Recipe is free' }, { status: 400 })
    }

    // Check if already purchased
    const { data: existing } = await (supabase as any)
      .from('recipe_purchases')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('buyer_id', buyerId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
    }

    // Calculate split: 90% creator, 10% platform
    const amountPaid = recipe.price
    const platformFee = amountPaid * 0.10
    const creatorEarnings = amountPaid - platformFee

    // Create purchase
    const { data: purchase, error: purchaseError } = await (supabase as any)
      .from('recipe_purchases')
      .insert({
        recipe_id: recipeId,
        buyer_id: buyerId,
        amount_paid: amountPaid,
        creator_earnings: creatorEarnings,
        platform_fee: platformFee
      })
      .select()
      .single()

    if (purchaseError) {
      return NextResponse.json({ error: purchaseError.message }, { status: 500 })
    }

    // Return full recipe (trigger will handle earnings credit)
    return NextResponse.json({ 
      purchase,
      recipe: {
        ...recipe,
        steps: recipe.steps // Full access after purchase
      }
    })

  } catch (error) {
    console.error('Purchase recipe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
