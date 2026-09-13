import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Haversine: distance between two lat/lng points in miles
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// GET /api/nearby?lat=38.653&lng=-90.243&radius=10&cuisine=BBQ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '15') // miles
    const cuisine = searchParams.get('cuisine')
    const hasDiscount = searchParams.get('hasDiscount') === 'true'

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      const mockNearby = getMockNearby(lat, lng)
      return NextResponse.json({
        vendors: mockNearby,
        userLocation: { lat, lng },
        mock: true,
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      const mockNearby = getMockNearby(lat, lng)
      return NextResponse.json({ vendors: mockNearby, userLocation: { lat, lng }, mock: true })
    }

    let query = (supabase as any)
      .from('vendors')
      .select('*')
      .eq('active', true)

    if (cuisine) query = query.eq('cuisine_type', cuisine)
    if (hasDiscount) query = query.not('discount_offer', 'is', null)

    const { data: vendors, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ vendors: getMockNearby(lat, lng), userLocation: { lat, lng }, mock: true })
    }

    // Calculate distances and filter by radius
    const withDistance = (vendors as any[])
      .map(v => {
        const vLat = v.latitude || v.lat || 0
        const vLng = v.longitude || v.lng || 0
        const distance = haversineMiles(lat, lng, vLat, vLng)
        return { ...v, distanceMiles: Math.round(distance * 10) / 10 }
      })
      .filter(v => v.distanceMiles <= radius)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)

    return NextResponse.json({
      vendors: withDistance,
      userLocation: { lat, lng },
      count: withDistance.length,
    })

  } catch (error) {
    console.error('Nearby error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getMockNearby(userLat: number, userLng: number) {
  // Mock vendors placed around St. Louis / New Orleans with real-ish coords
  const mockVendors = [
    {
      id: 'mock-vendor-1',
      name: 'Smoke & Fire BBQ',
      description: 'Slow-smoked Louisiana-style BBQ. Ribs, brisket, pulled pork.',
      location_text: 'Soulard, St. Louis',
      cuisine_type: 'BBQ',
      price_range: '$$',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      discount_offer: '10% off with HungerSwipes photo',
      discount_code: 'BRISKET10',
      latitude: 38.5848,
      longitude: -90.2107,
      active: true,
      verified: false,
    },
    {
      id: 'mock-vendor-2',
      name: "Treme Pot",
      description: "Authentic New Orleans po' boys and gumbo. Under the bridge since 1987.",
      location_text: 'Bywater, New Orleans',
      cuisine_type: 'Cajun',
      price_range: '$',
      image_url: 'https://images.unsplash.com/photo-1626804475297-411d863b67ab?w=400&h=300&fit=crop',
      discount_offer: "Free drink with po' boy",
      discount_code: 'SWIPEFREE',
      latitude: 29.9642,
      longitude: -90.0422,
      active: true,
      verified: true,
    },
    {
      id: 'mock-vendor-3',
      name: 'Daq Airy',
      description: 'Korean-Memphis fusion BBQ. Kimchi mac, burnt ends, loaded fries.',
      location_text: 'Delmar Loop, St. Louis',
      cuisine_type: 'Fusion',
      price_range: '$$',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      discount_offer: '15% off for HungerSwipes',
      discount_code: 'SWIPE15',
      latitude: 38.6557,
      longitude: -90.2961,
      active: true,
      verified: false,
    },
    {
      id: 'mock-vendor-4',
      name: "Mama's Fried Fish",
      description: "Under-the-bridge fried fish and catfish. Cash only, cash happy.",
      location_text: 'South St. Louis',
      cuisine_type: 'Soul Food',
      price_range: '$',
      image_url: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
      discount_offer: 'Free hush puppies',
      discount_code: 'FISHFREE',
      latitude: 38.5405,
      longitude: -90.2544,
      active: true,
      verified: false,
    },
    {
      id: 'mock-vendor-5',
      name: 'Bridge City Birria',
      description: 'Birria tacos and quesadillas made fresh daily under the I-10 bridge.',
      location_text: 'Gentilly, New Orleans',
      cuisine_type: 'Mexican',
      price_range: '$',
      image_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
      discount_offer: 'Free consome with order',
      discount_code: 'BIRRIA',
      latitude: 29.9734,
      longitude: -90.0653,
      active: true,
      verified: true,
    },
  ]

  return mockVendors
    .map(v => {
      const distance = haversineMiles(userLat, userLng, v.latitude, v.longitude)
      return { ...v, distanceMiles: Math.round(distance * 10) / 10 }
    })
    .filter(v => v.distanceMiles <= 25)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}
