import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { calculateCompletenessScore, getPayoutTier } from '@/lib/metadata-scoring'

// GET /api/photos - Get photos for swipe feed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eaterId = searchParams.get('eaterId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Filter params
    const vegetarian = searchParams.get('vegetarian') === 'true'
    const vegan = searchParams.get('vegan') === 'true'
    const glutenFree = searchParams.get('glutenFree') === 'true'
    const healthCategory = searchParams.get('healthCategory')
    const cuisineTag = searchParams.get('cuisineTag')
    const priceRange = searchParams.get('priceRange')
    const spiceLevel = searchParams.get('spiceLevel')
    const maxCalories = searchParams.get('maxCalories')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const sortBy = searchParams.get('sortBy') || 'hunger_score'

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ photos: getMockPhotos(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ photos: getMockPhotos(), mock: true })
    }

    let query = (supabase as any)
      .from('photos')
      .select(`
        id,
        image_url,
        thumbnail_url,
        title,
        description,
        dish_name,
        restaurant_name,
        restaurant_location,
        location_text,
        cuisine_type,
        cuisine_tags,
        price_range,
        price,
        commission_rate,
        hunger_score,
        completeness_score,
        metadata_quality_status,
        tags,
        dietary_tags,
        ingredient_tags,
        calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        spice_level,
        portion_size,
        vegetarian_option,
        vegan_option,
        gluten_free_option,
        health_category,
        viral_score,
        content_label,
        vendor_id,
        discount_offer,
        discount_code,
        has_discount,
        created_at,
        creator:profiles!creator_id (
          id,
          username,
          avatar_url
        ),
        vendor:vendors!vendor_id (
          id,
          name,
          location_text,
          discount_offer,
          discount_code
        )
      `)
      .eq('status', 'active')
      .limit(limit)

    // Apply filters
    if (vegetarian) query = query.eq('vegetarian_option', true)
    if (vegan) query = query.eq('vegan_option', true)
    if (glutenFree) query = query.eq('gluten_free_option', true)
    if (healthCategory) query = query.eq('health_category', healthCategory)
    if (cuisineTag) query = query.contains('cuisine_tags', [cuisineTag])
    if (priceRange) query = query.eq('price_range', priceRange)
    if (spiceLevel) query = query.eq('spice_level', parseInt(spiceLevel))
    if (maxCalories) query = query.lte('calories', parseInt(maxCalories))
    if (tags && tags.length > 0) query = query.overlaps('tags', tags)

    // Sorting
    if (sortBy === 'rank_score') {
      query = query.order('completeness_score', { ascending: false })
      query = query.order('hunger_score', { ascending: false })
    } else {
      query = query.order('hunger_score', { ascending: false })
    }

    if (cursor) {
      query = query.lt('hunger_score', parseFloat(cursor))
    }

    // Exclude already-swiped photos
    if (eaterId) {
      const { data: swipedIds } = await (supabase as any)
        .from('swipes')
        .select('photo_id')
        .eq('eater_id', eaterId)

      const ids = swipedIds?.map((s: any) => s.photo_id) || []
      if (ids.length > 0) {
        query = query.not('id', 'in', `(${ids.join(',')})`)
      }
    }

    const { data: photos, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const photosWithComputed = (photos || []).map((photo: any) => ({
      ...photo,
      rank_score: calculateRankScore({
        hungerScore: photo.hunger_score || 0,
        completenessScore: photo.completeness_score || 0,
        viralScore: photo.viral_score || 0,
        createdAt: new Date(photo.created_at),
        orderVelocity: 0
      }),
      payout_tier: getPayoutTier(photo.completeness_score || 0),
    }))

    // If DB is empty, fall back to mock photos
    if (photosWithComputed.length === 0) {
      return NextResponse.json({ photos: getMockPhotos(), mock: true, note: 'DB empty — using demo photos' })
    }

    return NextResponse.json({ photos: photosWithComputed })

  } catch (error) {
    console.error('Get photos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/photos - Upload a new food photo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      creatorId,
      imageUrl,
      title,
      description,
      dishName,
      restaurantName,
      restaurantLocation,
      locationText,
      cuisineType,
      cuisineTags,
      priceRange,
      price,
      commissionRate = 0.10,
      tags,
      dietaryTags,
      ingredientTags,
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      spiceLevel,
      portionSize,
      vegetarianOption,
      veganOption,
      glutenFreeOption,
      healthCategory,
      // Vendor / discount fields
      vendorId,
      discountOffer,
      discountCode,
      hasDiscount,
    } = body

    if (!creatorId || !dishName || !restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, dishName, restaurantName' },
        { status: 400 }
      )
    }

    const metadata = {
      title,
      description,
      tags,
      dietary_tags: dietaryTags,
      ingredient_tags: ingredientTags,
      cuisine_tags: cuisineTags,
      calories,
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams,
      spice_level: spiceLevel,
      portion_size: portionSize,
      restaurant_name: restaurantName,
      location_text: locationText,
      price,
      vegetarian_option: vegetarianOption,
      vegan_option: veganOption,
      gluten_free_option: glutenFreeOption,
      health_category: healthCategory,
    }

    const completenessResult = calculateCompletenessScore(metadata)
    const payoutTier = getPayoutTier(completenessResult.score)

    const mockPhoto = {
      id: 'mock-photo-' + Date.now(),
      creator_id: creatorId,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop',
      title: title || '',
      description: description || '',
      dish_name: dishName,
      restaurant_name: restaurantName,
      restaurant_location: restaurantLocation,
      location_text: locationText,
      cuisine_type: cuisineType,
      cuisine_tags: cuisineTags || [],
      price_range: priceRange,
      price: price,
      commission_rate: commissionRate,
      hunger_score: 0,
      completeness_score: completenessResult.score,
      metadata_quality_status: payoutTier.tier,
      tags: tags || [],
      dietary_tags: dietaryTags || [],
      ingredient_tags: ingredientTags || [],
      calories,
      protein_grams: proteinGrams,
      carbs_grams: carbsGrams,
      fat_grams: fatGrams,
      spice_level: spiceLevel,
      portion_size: portionSize,
      vegetarian_option: vegetarianOption || false,
      vegan_option: veganOption || false,
      gluten_free_option: glutenFreeOption || false,
      health_category: healthCategory,
      vendor_id: vendorId,
      discount_offer: discountOffer,
      discount_code: discountCode,
      has_discount: hasDiscount,
      status: 'pending',
      mock: true,
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        photo: mockPhoto,
        completeness_breakdown: completenessResult.breakdown,
        missing_items: completenessResult.missingItems,
        payout_tier: payoutTier,
        mock: true,
      })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        photo: mockPhoto,
        completeness_breakdown: completenessResult.breakdown,
        missing_items: completenessResult.missingItems,
        payout_tier: payoutTier,
        mock: true,
      })
    }

    // Check if creator profile exists
    const { data: existingProfile } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('id', creatorId)
      .single()

    if (!existingProfile) {
      await (supabase as any)
        .from('profiles')
        .insert({
          id: creatorId,
          email: `creator_${creatorId.slice(-8)}@demo.local`,
          full_name: 'Food Creator',
          username: `creator_${creatorId.slice(-8)}`
        })
    }

    const { data: photo, error: insertError } = await (supabase as any)
      .from('photos')
      .insert({
        creator_id: creatorId,
        image_url: imageUrl,
        title: title || dishName,
        description,
        dish_name: dishName,
        restaurant_name: restaurantName,
        restaurant_location: restaurantLocation,
        location_text: locationText,
        cuisine_type: cuisineType,
        cuisine_tags: cuisineTags,
        price_range: priceRange,
        price,
        commission_rate: commissionRate,
        tags: tags,
        dietary_tags: dietaryTags,
        ingredient_tags: ingredientTags,
        calories,
        protein_grams: proteinGrams,
        carbs_grams: carbsGrams,
        fat_grams: fatGrams,
        spice_level: spiceLevel,
        portion_size: portionSize,
        vegetarian_option: vegetarianOption || false,
        vegan_option: veganOption || false,
        gluten_free_option: glutenFreeOption || false,
        health_category: healthCategory,
        completeness_score: completenessResult.score,
        metadata_quality_status: payoutTier.tier,
        vendor_id: vendorId,
        discount_offer: discountOffer,
        discount_code: discountCode,
        has_discount: hasDiscount || false,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      // DB write failed (likely FK constraint or schema mismatch) — fall back to mock
      const mockPhoto = {
        id: `mock-${Date.now()}`,
        creator_id: creatorId,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop',
        title: title || dishName,
        description: description || '',
        dish_name: dishName,
        restaurant_name: restaurantName,
        restaurant_location: restaurantLocation,
        cuisine_type: cuisineType,
        cuisine_tags: cuisineTags || [],
        price_range: priceRange,
        price,
        commission_rate: commissionRate,
        tags: tags || [],
        dietary_tags: dietaryTags || [],
        calories,
        protein_grams: proteinGrams,
        carbs_grams: carbsGrams,
        fat_grams: fatGrams,
        spice_level: spiceLevel,
        portion_size: portionSize,
        vegetarian_option: vegetarianOption || false,
        vegan_option: veganOption || false,
        gluten_free_option: glutenFreeOption || false,
        health_category: healthCategory,
        completeness_score: completenessResult.score,
        metadata_quality_status: payoutTier.tier,
        hunger_score: 0,
        status: 'pending',
        mock: true,
      }
      return NextResponse.json({
        photo: mockPhoto,
        completeness_breakdown: completenessResult.breakdown,
        missing_items: completenessResult.missingItems,
        payout_tier: payoutTier,
        mock: true,
        note: 'DB not configured — using mock mode',
      })
    }

    return NextResponse.json({
      photo,
      completeness_breakdown: completenessResult.breakdown,
      missing_items: completenessResult.missingItems,
      payout_tier: payoutTier
    })

  } catch (error) {
    console.error('Upload photo error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateRankScore(factors: { hungerScore: number; completenessScore: number; viralScore: number; createdAt: Date; orderVelocity: number }): number {
  const HUNGER_WEIGHT = 0.40
  const COMPLETENESS_WEIGHT = 0.20
  const VIRAL_WEIGHT = 0.15
  const RECENCY_WEIGHT = 0.15
  const VELOCITY_WEIGHT = 0.10

  const hoursOld = (Date.now() - factors.createdAt.getTime()) / (1000 * 60 * 60)
  const recencyBoost = Math.max(0, 100 - (hoursOld / 1.68))
  const velocityScore = Math.min(100, factors.orderVelocity * 10)
  const normalizedViral = Math.min(100, factors.viralScore / 5)

  return Math.round(
    (factors.hungerScore * HUNGER_WEIGHT) +
    (factors.completenessScore * COMPLETENESS_WEIGHT) +
    (normalizedViral * VIRAL_WEIGHT) +
    (recencyBoost * RECENCY_WEIGHT) +
    (velocityScore * VELOCITY_WEIGHT)
  )
}

function getMockPhotos() {
  return [
    {
      id: 'mock-1',
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop',
      title: 'Classic Margherita Pizza',
      description: 'Fresh mozzarella, San Marzano tomatoes, and fragrant basil on a perfectly crispy crust.',
      dish_name: 'Margherita Pizza',
      restaurant_name: 'Pizzeria Locale',
      restaurant_location: 'St. Louis, MO',
      location_text: 'Delmar Loop, St. Louis',
      cuisine_type: 'Italian',
      cuisine_tags: ['Italian'],
      price_range: '$$',
      price: 18.00,
      commission_rate: 0.10,
      hunger_score: 94,
      completeness_score: 75,
      metadata_quality_status: 'top-tier',
      tags: ['pizza', 'cheesy', 'comfort food'],
      dietary_tags: ['vegetarian'],
      calories: 850,
      protein_grams: 32,
      carbs_grams: 95,
      fat_grams: 38,
      spice_level: 1,
      portion_size: 'regular',
      vegetarian_option: true,
      vegan_option: false,
      gluten_free_option: false,
      health_category: 'indulgent',
      viral_score: 156,
      content_label: 'trending',
      has_discount: false,
      creator: { username: '@stlfoodie' }
    },
    {
      id: 'mock-2',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop',
      title: 'Acai Sunrise Bowl',
      description: 'Organic acai blended with banana and topped with fresh berries, granola, and honey.',
      dish_name: 'Acai Bowl',
      restaurant_name: 'Green Bowl',
      restaurant_location: 'St. Louis, MO',
      cuisine_type: 'Healthy',
      cuisine_tags: ['American', 'Healthy'],
      price_range: '$$',
      price: 14.00,
      commission_rate: 0.12,
      hunger_score: 89,
      completeness_score: 85,
      metadata_quality_status: 'top-tier',
      tags: ['acai bowl', 'healthy', 'fresh'],
      dietary_tags: ['vegan', 'gluten-free', 'organic'],
      calories: 420,
      protein_grams: 8,
      carbs_grams: 72,
      fat_grams: 12,
      spice_level: 1,
      portion_size: 'regular',
      vegetarian_option: true,
      vegan_option: true,
      gluten_free_option: true,
      health_category: 'healthy',
      viral_score: 89,
      content_label: 'discovery',
      has_discount: false,
      creator: { username: '@healthyeats' }
    },
    {
      id: 'mock-3',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop',
      title: 'Texas-Style Brisket Platter',
      description: 'Slow-smoked 14-hour brisket with signature spice rub, served with two sides.',
      dish_name: 'Brisket Platter',
      restaurant_name: 'Smoke & Fire BBQ',
      restaurant_location: 'St. Louis, MO',
      cuisine_type: 'BBQ',
      cuisine_tags: ['American', 'BBQ'],
      price_range: '$$$',
      price: 28.00,
      commission_rate: 0.10,
      hunger_score: 97,
      completeness_score: 65,
      metadata_quality_status: 'enhanced',
      tags: ['BBQ ribs', 'steak', 'comfort food', 'soul food'],
      dietary_tags: ['gluten-free'],
      calories: 1200,
      protein_grams: 65,
      carbs_grams: 45,
      fat_grams: 82,
      spice_level: 2,
      portion_size: 'large',
      vegetarian_option: false,
      vegan_option: false,
      gluten_free_option: true,
      health_category: 'indulgent',
      viral_score: 234,
      content_label: 'trending',
      has_discount: true,
      discount_offer: '10% off with this photo',
      discount_code: 'BRISKET10',
      vendor: { id: 'mock-vendor-1', name: 'Smoke \& Fire BBQ', location_text: 'Soulard, St. Louis' },
      creator: { username: '@meatlovers_mike' }
    }
  ]
}
