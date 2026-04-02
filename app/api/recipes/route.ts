import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/recipes - Create a paid recipe attached to a post
export async function POST(request: NextRequest) {
  try {
    const { 
      photoId, 
      creatorId, 
      recipeTitle, 
      ingredients, 
      steps, 
      prepTimeMinutes, 
      cookTimeMinutes, 
      price 
    } = await request.json()

    if (!photoId || !creatorId || !recipeTitle || !ingredients || !steps) {
      return NextResponse.json(
        { error: 'Missing required fields: photoId, creatorId, recipeTitle, ingredients, steps' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      const mockRecipe = {
        id: 'mock-recipe-' + Date.now(),
        photo_id: photoId,
        creator_id: creatorId,
        recipe_title: recipeTitle,
        ingredients,
        steps,
        prep_time_minutes: prepTimeMinutes || null,
        cook_time_minutes: cookTimeMinutes || null,
        price: price || 0,
        purchase_count: 0,
        revenue_total: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        mock: true
      }
      return NextResponse.json({ recipe: mockRecipe, mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Verify photo belongs to creator
    const { data: photo, error: photoError } = await (supabase as any)
      .from('photos')
      .select('id, creator_id')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (photo.creator_id !== creatorId) {
      return NextResponse.json({ error: 'Photo does not belong to you' }, { status: 403 })
    }

    // Create recipe
    const { data: recipe, error: recipeError } = await (supabase as any)
      .from('recipes')
      .insert({
        photo_id: photoId,
        creator_id: creatorId,
        recipe_title: recipeTitle,
        ingredients,
        steps,
        prep_time_minutes: prepTimeMinutes || null,
        cook_time_minutes: cookTimeMinutes || null,
        price: price || 0
      })
      .select()
      .single()

    if (recipeError) {
      return NextResponse.json({ error: recipeError.message }, { status: 500 })
    }

    // Update photo content_label to 'monetized'
    await (supabase as any)
      .from('photos')
      .update({ content_label: 'monetized' })
      .eq('id', photoId)

    return NextResponse.json({ recipe })

  } catch (error) {
    console.error('Create recipe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/recipes - Get recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    const creatorId = searchParams.get('creatorId')
    const buyerId = searchParams.get('buyerId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ recipes: getMockRecipes(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ recipes: getMockRecipes(), mock: true })
    }

    let query = (supabase as any)
      .from('recipes')
      .select(`
        id,
        photo_id,
        recipe_title,
        ingredients,
        steps,
        prep_time_minutes,
        cook_time_minutes,
        price,
        purchase_count,
        revenue_total,
        status,
        created_at,
        creator:profiles!creator_id (
          id,
          username,
          avatar_url
        ),
        photo:photos (
          id,
          dish_name,
          image_url
        )
      `)
      .eq('status', 'active')
      .limit(limit)

    if (photoId) {
      query = query.eq('photo_id', photoId)
    }
    if (creatorId) {
      query = query.eq('creator_id', creatorId)
    }

    const { data: recipes, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Check which recipes the buyer has purchased
    let purchasedIds: string[] = []
    if (buyerId && recipes && recipes.length > 0) {
      const recipeIds = recipes.map((r: any) => r.id)
      const { data: purchases } = await (supabase as any)
        .from('recipe_purchases')
        .select('recipe_id')
        .eq('buyer_id', buyerId)
        .in('recipe_id', recipeIds)
      
      purchasedIds = purchases?.map((p: any) => p.recipe_id) || []
    }

    // Mask steps for unpurchased paid recipes
    const recipesWithAccess = (recipes || []).map((recipe: any) => {
      const hasPurchased = purchasedIds.includes(recipe.id)
      const isFree = recipe.price === 0
      const isOwner = recipe.creator_id === buyerId
      
      if ((hasPurchased || isFree || isOwner) && recipe.steps) {
        return recipe
      }
      
      return {
        ...recipe,
        steps: recipe.steps ? recipe.steps.map((_: any, i: number) => `Step ${i + 1} (Unlock to view)`) : [],
        ingredients: recipe.price === 0 ? recipe.ingredients : recipe.ingredients?.slice(0, 3) || []
      }
    })

    return NextResponse.json({ recipes: recipesWithAccess })

  } catch (error) {
    console.error('Get recipes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockRecipes() {
  return [
    {
      id: 'mock-recipe-1',
      photo_id: 'mock-3',
      recipe_title: 'Perfect Smoked Brisket',
      ingredients: ['12lb brisket', 'BBQ rub', 'Mustard binder', 'Beef tallow'],
      steps: ['Step 1 (Unlock to view)', 'Step 2 (Unlock to view)', 'Step 3 (Unlock to view)'],
      prep_time_minutes: 30,
      cook_time_minutes: 720,
      price: 4.99,
      purchase_count: 156,
      revenue_total: 622.44,
      status: 'active',
      creator: { username: '@meatlovers_mike' },
      photo: { dish_name: 'Brisket Platter', image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200' }
    },
    {
      id: 'mock-recipe-2',
      photo_id: 'mock-1',
      recipe_title: 'Perfect Pizza Dough',
      ingredients: ['500g bread flour', '325ml water', '10g salt', '7g yeast', 'Olive oil'],
      steps: ['Mix flour and water', 'Add salt and yeast', 'Knead for 10 minutes', 'Rise for 24 hours'],
      prep_time_minutes: 15,
      cook_time_minutes: 15,
      price: 0,
      purchase_count: 0,
      revenue_total: 0,
      status: 'active',
      creator: { username: '@stlfoodie' },
      photo: { dish_name: 'Margherita Pizza', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200' }
    }
  ]
}
