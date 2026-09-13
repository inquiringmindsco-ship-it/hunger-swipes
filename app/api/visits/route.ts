import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/visits - Get verifications for a photo or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ verifications: getMockVerifications(photoId), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ verifications: getMockVerifications(photoId), mock: true })
    }

    let query = (supabase as any)
      .from('visit_verifications')
      .select(`
        id,
        photo_id,
        restaurant_name,
        dish_name,
        verification_type,
        accuracy_rating,
        ordered_same_dish,
        comparison_photo_url,
        points_awarded,
        trust_level,
        status,
        created_at,
        user:profiles!user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (photoId) query = query.eq('photo_id', photoId)
    if (userId) query = query.eq('user_id', userId)

    const { data: verifications, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ verifications: verifications || [] })

  } catch (error) {
    console.error('Get verifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/visits - Submit a visit verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      photoId,
      restaurantName,
      dishName,
      verificationType = 'self-reported',
      accuracyRating,
      orderedSameDish = false,
      comparisonPhotoUrl,
      receiptUrl,
      notes,
    } = body

    if (!userId || !restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, restaurantName' },
        { status: 400 }
      )
    }

    // Determine trust level
    let trustLevel = 1
    if (receiptUrl) trustLevel = 3
    else if (comparisonPhotoUrl) trustLevel = 2

    if (!isSupabaseConfigured()) {
      const mockPoints = comparisonPhotoUrl ? 15 : receiptUrl ? 20 : accuracyRating ? 5 : 5
      return NextResponse.json({
        verification: {
          id: 'mock-verification-' + Date.now(),
          user_id: userId,
          photo_id: photoId,
          restaurant_name: restaurantName,
          dish_name: dishName,
          verification_type: verificationType,
          accuracy_rating: accuracyRating,
          ordered_same_dish: orderedSameDish,
          comparison_photo_url: comparisonPhotoUrl,
          points_awarded: mockPoints,
          trust_level: trustLevel,
          status: 'approved',
          mock: true,
        },
        points_awarded: mockPoints,
        mock: true,
      })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      const mockPoints = comparisonPhotoUrl ? 15 : receiptUrl ? 20 : accuracyRating ? 5 : 5
      return NextResponse.json({
        verification: {
          id: 'mock-verification-' + Date.now(),
          user_id: userId,
          photo_id: photoId,
          restaurant_name: restaurantName,
          dish_name: dishName,
          verification_type: verificationType || 'self-reported',
          accuracy_rating: accuracyRating,
          ordered_same_dish: orderedSameDish,
          comparison_photo_url: comparisonPhotoUrl,
          points_awarded: mockPoints,
          trust_level: trustLevel,
          status: 'approved',
          mock: true,
        },
        points_awarded: mockPoints,
        mock: true,
      })
    }

    let verification
    try {
      const result = await (supabase as any)
        .from('visit_verifications')
        .insert({
          user_id: userId,
          photo_id: photoId,
          restaurant_name: restaurantName,
          dish_name: dishName,
          verification_type: verificationType,
          accuracy_rating: accuracyRating,
          ordered_same_dish: orderedSameDish,
          comparison_photo_url: comparisonPhotoUrl,
          receipt_url: receiptUrl,
          notes,
          trust_level: trustLevel,
          status: 'pending',
        })
        .select(`
          id,
          photo_id,
          restaurant_name,
          dish_name,
          verification_type,
          accuracy_rating,
          ordered_same_dish,
          comparison_photo_url,
          points_awarded,
          trust_level,
          status,
          created_at
        `)
        .single()

      if (result.error) {
        throw new Error(result.error.message)
      }
      verification = result.data
    } catch (dbError: any) {
      // Table doesn't exist or DB not ready — use mock response
      const mockPoints = comparisonPhotoUrl ? 15 : receiptUrl ? 20 : accuracyRating ? 5 : 5
      return NextResponse.json({
        verification: {
          id: 'mock-verification-' + Date.now(),
          user_id: userId,
          photo_id: photoId,
          restaurant_name: restaurantName,
          dish_name: dishName,
          verification_type: verificationType || 'self-reported',
          accuracy_rating: accuracyRating,
          ordered_same_dish: orderedSameDish,
          comparison_photo_url: comparisonPhotoUrl,
          points_awarded: mockPoints,
          trust_level: trustLevel,
          status: 'approved',
          mock: true,
        },
        points_awarded: mockPoints,
        mock: true,
        note: 'DB not ready — using mock mode',
      })
    }

    // If status was auto-approved by trigger, fetch updated
    if (verification.status === 'approved') {
      return NextResponse.json({
        verification,
        points_awarded: verification.points_awarded,
        message: `Thanks! You earned ${verification.points_awarded} points.`,
      })
    }

    return NextResponse.json({
      verification,
      message: 'Verification submitted! Points will be awarded after review.',
    })

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/visits/points - Get user's points and tier
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        points: {
          user_id: userId,
          total_points: 245,
          lifetime_points: 890,
          tier: 'critic',
        },
        mock: true,
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: points, error } = await (supabase as any)
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create if doesn't exist
    if (!points) {
      const { data: newPoints } = await (supabase as any)
        .from('user_points')
        .insert({ user_id: userId, total_points: 0, lifetime_points: 0 })
        .select()
        .single()
      return NextResponse.json({ points: newPoints })
    }

    return NextResponse.json({ points })

  } catch (error) {
    console.error('Get points error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getMockVerifications(photoId?: string | null) {
  const verifications = [
    {
      id: 'mock-v1',
      photo_id: photoId || 'mock-1',
      restaurant_name: 'Pizzeria Locale',
      dish_name: 'Margherita Pizza',
      verification_type: 'photo-confirmed',
      accuracy_rating: 'accurate',
      ordered_same_dish: true,
      comparison_photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
      points_awarded: 15,
      trust_level: 2,
      status: 'approved',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      user: { username: '@stlfoodie', avatar_url: null },
    },
    {
      id: 'mock-v2',
      photo_id: photoId || 'mock-1',
      restaurant_name: 'Pizzeria Locale',
      dish_name: 'Margherita Pizza',
      verification_type: 'self-reported',
      accuracy_rating: 'mostly_accurate',
      ordered_same_dish: false,
      comparison_photo_url: null,
      points_awarded: 5,
      trust_level: 1,
      status: 'approved',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      user: { username: '@pizza_lover', avatar_url: null },
    },
    {
      id: 'mock-v3',
      photo_id: photoId || 'mock-2',
      restaurant_name: 'Green Bowl',
      dish_name: 'Acai Bowl',
      verification_type: 'receipt-confirmed',
      accuracy_rating: 'accurate',
      ordered_same_dish: true,
      comparison_photo_url: null,
      receipt_url: 'mock-receipt.pdf',
      points_awarded: 20,
      trust_level: 3,
      status: 'approved',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      user: { username: '@healthyeats_stl', avatar_url: null },
    },
  ]

  if (photoId) {
    return verifications.filter((v) => v.photo_id === photoId)
  }
  return verifications
}
