import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      foodName, description, priceRange,
      locationText, latitude, longitude,
      isOpen, paymentMethods, hoursText,
    } = body

    if (!foodName || !priceRange) {
      return NextResponse.json({ error: 'Food name and price range required' }, { status: 400 })
    }

    const vendorData = {
      food_name: foodName,
      description: description || null,
      price_range: priceRange,
      location_text: locationText,
      latitude: latitude || null,
      longitude: longitude || null,
      is_open: isOpen !== false,
      payment_methods: paymentMethods || [],
      hours_text: hoursText || null,
      status: 'active',
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert(vendorData)
      .select('id')
      .single()

    if (error) {
      console.warn('Supabase not available, using demo mode:', error.message)
      return NextResponse.json({
        vendorId: `VENDOR-${Date.now().toString(36).toUpperCase()}`,
        demo: true,
      })
    }

    await supabase.from('vendor_activity').insert({
      vendor_id: data.id,
      activity_type: 'created',
    })

    return NextResponse.json({ vendorId: data.id })
  } catch (error: any) {
    console.error('Vendor registration error:', error)
    return NextResponse.json({
      vendorId: `VENDOR-${Date.now().toString(36).toUpperCase()}`,
      demo: true,
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('id')

    if (vendorId) {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single()
      if (error) throw error
      return NextResponse.json({ vendor: data })
    }

    // List vendors (optionally by location)
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ vendors: data || [] })
  } catch (error: any) {
    return NextResponse.json({ vendors: [], vendor: null, error: error.message })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('id')
    if (!vendorId) return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 })

    const body = await request.json()
    const { foodName, description, priceRange, locationText, isOpen, hoursText, paymentMethods } = body

    const updateData: any = { updated_at: new Date().toISOString() }
    if (foodName !== undefined) updateData.food_name = foodName
    if (description !== undefined) updateData.description = description
    if (priceRange !== undefined) updateData.price_range = priceRange
    if (locationText !== undefined) updateData.location_text = locationText
    if (isOpen !== undefined) updateData.is_open = isOpen
    if (hoursText !== undefined) updateData.hours_text = hoursText
    if (paymentMethods !== undefined) updateData.payment_methods = paymentMethods

    const { data, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', vendorId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('vendor_activity').insert({
      vendor_id: vendorId,
      activity_type: 'updated',
    })

    return NextResponse.json({ vendor: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
