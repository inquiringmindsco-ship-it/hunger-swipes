import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getPayoutTier } from '@/lib/metadata-scoring'

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const { photoId, eaterId, dishPrice, orderUrl } = await request.json()

    if (!photoId || !eaterId) {
      return NextResponse.json(
        { error: 'Missing required fields: photoId, eaterId' },
        { status: 400 }
      )
    }

    // Mock mode - works with or without Supabase configured (for demo mode)
    const isMockMode = !isSupabaseConfigured() || photoId.startsWith('mock-')

    if (isMockMode) {
      const mockScores: Record<string, number> = {
        'mock-1': 75, 'mock-2': 85, 'mock-3': 65, 'mock-4': 45, 'mock-5': 30, 'mock-6': 20,
      }
      const mockDishPrices: Record<string, number> = {
        'mock-1': 18.00, 'mock-2': 14.00, 'mock-3': 28.00, 'mock-4': 22.00, 'mock-5': 12.00, 'mock-6': 10.00,
      }
      const completenessScore = mockScores[photoId] || 50
      const tier = getPayoutTier(completenessScore)
      const actualDishPrice = dishPrice || mockDishPrices[photoId] || 20.00
      const commissionRate = 0.10
      const commissionAmount = actualDishPrice * commissionRate
      const platformFee = commissionAmount * 0.10
      const creatorEarnings = commissionAmount * tier.creatorRate

      return NextResponse.json({
        order: {
          id: 'mock-order-' + Date.now(),
          photo_id: photoId,
          eater_id: eaterId,
          dish_price: actualDishPrice,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          platform_fee: platformFee,
          creator_earnings: creatorEarnings,
          creator_rate: tier.creatorRate,
          payout_tier: tier.tier,
          completeness_score: completenessScore,
          status: 'pending',
          mock: true
        },
        mock: true
      })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get photo and creator info
    const { data: photo, error: photoError } = await (supabase as any)
      .from('photos')
      .select('id, creator_id, restaurant_name, dish_name, commission_rate, completeness_score, metadata_quality_status')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    const completenessScore = photo.completeness_score || 0
    const creatorId = photo.creator_id
    const restaurantName = photo.restaurant_name
    const dishName = photo.dish_name
    const commissionRate = photo.commission_rate

    // Determine payout tier based on completeness score
    const tier = getPayoutTier(completenessScore)
    
    const dishPriceNum = dishPrice || 20.00
    const commissionAmount = dishPriceNum * commissionRate
    const platformFee = commissionAmount * 0.10
    const creatorEarnings = commissionAmount * tier.creatorRate

    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .insert({
        photo_id: photoId,
        eater_id: eaterId,
        creator_id: creatorId,
        restaurant_name: restaurantName,
        dish_name: dishName,
        dish_price: dishPriceNum,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        creator_rate: tier.creatorRate,
        payout_tier: tier.tier,
        completeness_score: completenessScore,
        order_url: orderUrl,
        status: 'pending'
      })
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/orders - Get orders for creator
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ orders: getMockOrders(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ orders: getMockOrders(), mock: true })
    }

    if (!creatorId) {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 })
    }

    const { data: orders, error } = await (supabase as any)
      .from('orders')
      .select(`
        id,
        dish_name,
        restaurant_name,
        dish_price,
        commission_amount,
        creator_earnings,
        commission_rate,
        creator_rate,
        payout_tier,
        completeness_score,
        status,
        created_at,
        photo:photos!photo_id (id, image_url, completeness_score, metadata_quality_status)
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ orders: orders || [] })

  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockOrders() {
  return [
    {
      id: 'mock-1',
      dish_name: 'Brisket Platter',
      restaurant_name: 'Smoke & Fire BBQ',
      dish_price: 28.00,
      commission_amount: 2.80,
      creator_earnings: 2.66,
      platform_fee: 0.28,
      commission_rate: 0.10,
      creator_rate: 0.95,
      payout_tier: 'top-tier',
      completeness_score: 65,
      status: 'completed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      photo: { image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200', completeness_score: 65, metadata_quality_status: 'enhanced' }
    },
    {
      id: 'mock-2',
      dish_name: 'Margherita Pizza',
      restaurant_name: 'Pizzeria Locale',
      dish_price: 18.00,
      commission_amount: 1.80,
      creator_earnings: 1.71,
      platform_fee: 0.18,
      commission_rate: 0.10,
      creator_rate: 0.95,
      payout_tier: 'top-tier',
      completeness_score: 75,
      status: 'completed',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      photo: { image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200', completeness_score: 75, metadata_quality_status: 'top-tier' }
    },
    {
      id: 'mock-3',
      dish_name: 'Dragon Roll',
      restaurant_name: 'Sakura Sushi',
      dish_price: 22.00,
      commission_amount: 3.30,
      creator_earnings: 2.97,
      platform_fee: 0.33,
      commission_rate: 0.15,
      creator_rate: 0.90,
      payout_tier: 'enhanced',
      completeness_score: 45,
      status: 'completed',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      photo: { image_url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200', completeness_score: 45, metadata_quality_status: 'enhanced' }
    },
    {
      id: 'mock-4',
      dish_name: 'Blueberry Stack',
      restaurant_name: 'Stacked Pancakes',
      dish_price: 12.00,
      commission_amount: 0.96,
      creator_earnings: 0.82,
      platform_fee: 0.10,
      commission_rate: 0.08,
      creator_rate: 0.85,
      payout_tier: 'basic',
      completeness_score: 30,
      status: 'completed',
      created_at: new Date(Date.now() - 345600000).toISOString(),
      photo: { image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200', completeness_score: 30, metadata_quality_status: 'basic' }
    }
  ]
}
