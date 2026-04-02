import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

// GET /api/vendors - List vendors (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const cuisine = searchParams.get('cuisine')
    const hasDiscount = searchParams.get('hasDiscount') === 'true'

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ vendors: getMockVendors(), mock: true })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ vendors: getMockVendors(), mock: true })
    }

    let query = (supabase as any)
      .from('vendors')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (city) query = query.eq('city', city)
    if (cuisine) query = query.eq('cuisine_type', cuisine)
    if (hasDiscount) query = query.not('discount_offer', 'is', null)

    const { data: vendors, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ vendors: getMockVendors(), mock: true, note: 'DB empty' })
    }

    return NextResponse.json({ vendors })

  } catch (error) {
    console.error('Get vendors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/vendors - Create / update vendor profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ownerId,
      name,
      description,
      locationText,
      address,
      city,
      neighborhood,
      cuisineType,
      priceRange,
      imageUrl,
      coverImageUrl,
      discountOffer,
      discountCode,
      minimumOrder,
      verified,
    } = body

    if (!ownerId || !name) {
      return NextResponse.json({ error: 'ownerId and name are required' }, { status: 400 })
    }

    const mockVendor = {
      id: 'mock-vendor-' + Date.now(),
      owner_id: ownerId,
      name,
      description,
      location_text: locationText,
      address,
      city,
      neighborhood: neighborhood || 'Other',
      cuisine_type: cuisineType,
      price_range: priceRange,
      image_url: imageUrl,
      cover_image_url: coverImageUrl,
      discount_offer: discountOffer,
      discount_code: discountCode,
      minimum_order: minimumOrder,
      active: true,
      verified: false,
      mock: true,
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ vendor: mockVendor, mock: true })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ vendor: mockVendor, mock: true })
    }

    // Check if vendor already exists for this owner
    const { data: existing } = await (supabase as any)
      .from('vendors')
      .select('id')
      .eq('id', ownerId)
      .single()

    let result
    if (existing) {
      // Update existing vendor
      const { data, error } = await (supabase as any)
        .from('vendors')
        .update({
          name,
          description,
          location_text: locationText,
          address,
          city,
          neighborhood: neighborhood || 'Other',
          cuisine_type: cuisineType,
          price_range: priceRange,
          image_url: imageUrl,
          cover_image_url: coverImageUrl,
          discount_offer: discountOffer,
          discount_code: discountCode,
          minimum_order: minimumOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownerId)
        .select()
        .single()

      result = { data, error }
    } else {
      // Create new vendor
      const { data, error } = await (supabase as any)
        .from('vendors')
        .insert({
          id: ownerId,
          name,
          description,
          location_text: locationText,
          address,
          city,
          neighborhood: neighborhood || 'Other',
          cuisine_type: cuisineType,
          price_range: priceRange,
          image_url: imageUrl,
          cover_image_url: coverImageUrl,
          discount_offer: discountOffer,
          discount_code: discountCode,
          minimum_order: minimumOrder,
          active: true,
          verified: false,
        })
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      return NextResponse.json({ vendor: mockVendor, mock: true, note: 'DB error — mock mode' })
    }

    return NextResponse.json({ vendor: result.data })

  } catch (error) {
    console.error('Create vendor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/vendors/redeem - Redeem a discount (eater shows code at register)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { photoId, vendorId, eaterId, orderTotal, discountCode } = body

    if (!photoId || !vendorId || !eaterId) {
      return NextResponse.json({ error: 'photoId, vendorId, and eaterId are required' }, { status: 400 })
    }

    // Mock redemption
    const mockRedemption = {
      id: 'mock-redemption-' + Date.now(),
      photo_id: photoId,
      vendor_id: vendorId,
      eater_id: eaterId,
      discount_code_used: discountCode,
      order_total: orderTotal || 0,
      discount_amount: orderTotal ? Math.round(orderTotal * 0.10 * 100) / 100 : 0,
      redeemed_at: new Date().toISOString(),
      mock: true,
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ redemption: mockRedemption, mock: true })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ redemption: mockRedemption, mock: true })
    }

    const { data, error } = await (supabase as any)
      .from('discount_redemptions')
      .insert({
        photo_id: photoId,
        vendor_id: vendorId,
        eater_id: eaterId,
        discount_code_used: discountCode,
        order_total: orderTotal,
        discount_amount: orderTotal ? Math.round(orderTotal * 0.10 * 100) / 100 : 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ redemption: mockRedemption, mock: true })
    }

    return NextResponse.json({ redemption: data })

  } catch (error) {
    console.error('Redeem discount error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getMockVendors() {
  return [
    {
      id: 'mock-vendor-1',
      name: 'Smoke & Fire BBQ',
      description: 'Slow-smoked Louisiana-style BBQ. Ribs, brisket, pulled pork — all smoked for 12+ hours.',
      location_text: 'Soulard neighborhood, St. Louis',
      address: '1911 S 9th St, St. Louis, MO',
      city: 'St. Louis',
      neighborhood: 'Soulard',
      cuisine_type: 'BBQ',
      price_range: '$$',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      cover_image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&h=300&fit=crop',
      discount_offer: '10% off when you show a HungerSwipes photo',
      discount_code: 'BRISKET10',
      minimum_order: 15,
      active: true,
      verified: false,
    },
    {
      id: 'mock-vendor-2',
      name: 'Treme Pot',
      description: 'Authentic New Orleans-style po\' boys and gumbo. Under the bridge since 1987.',
      location_text: 'Bywater, New Orleans',
      address: '1234 Royal St, New Orleans, LA',
      city: 'New Orleans',
      neighborhood: 'Bywater',
      cuisine_type: 'Cajun',
      price_range: '$',
      image_url: 'https://images.unsplash.com/photo-1626804475297-411d863b67ab?w=400&h=300&fit=crop',
      cover_image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&h=300&fit=crop',
      discount_offer: 'Free drink with any po\' boy',
      discount_code: 'SWIPEFREE',
      minimum_order: 10,
      active: true,
      verified: true,
    },
    {
      id: 'mock-vendor-3',
      name: 'Daq Airy',
      description: 'Korean-Memphis fusion BBQ. Kimchi mac, burnt ends, and the best loaded fries in the Lou.',
      location_text: 'Delmar Loop, St. Louis',
      address: '6321 Delmar Blvd, St. Louis, MO',
      city: 'St. Louis',
      neighborhood: 'Delmar Loop',
      cuisine_type: 'Fusion',
      price_range: '$$',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      cover_image_url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&h=300&fit=crop',
      discount_offer: '15% off for HungerSwipes members',
      discount_code: 'SWIPE15',
      minimum_order: 12,
      active: true,
      verified: false,
    },
  ]
}
