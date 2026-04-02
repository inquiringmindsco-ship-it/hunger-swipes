import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/verification - Submit creator verification application
export async function POST(request: NextRequest) {
  try {
    const { 
      creatorId, 
      businessName, 
      businessPermit, 
      kitchenType, 
      kitchenAddress,
      kitchenLat,
      kitchenLng,
      needsKitchenAssistance 
    } = await request.json()

    if (!creatorId || !businessName || !kitchenType) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, businessName, kitchenType' },
        { status: 400 }
      )
    }

    if (!['home', 'commercial', 'shared', 'pop-up'].includes(kitchenType)) {
      return NextResponse.json(
        { error: 'Invalid kitchen type' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      const mockVerification = {
        id: 'mock-verification-' + Date.now(),
        creator_id: creatorId,
        business_name: businessName,
        business_permit: businessPermit || null,
        kitchen_type: kitchenType,
        kitchen_address: kitchenAddress || null,
        kitchen_lat: kitchenLat || null,
        kitchen_lng: kitchenLng || null,
        needs_kitchen_assistance: needsKitchenAssistance || false,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        mock: true
      }
      return NextResponse.json({ verification: mockVerification, mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ verification: { id: 'mock', mock: true }, mock: true })
    }

    // Check if already has pending or approved verification
    const { data: existing } = await (supabase as any)
      .from('creator_verification')
      .select('status')
      .eq('creator_id', creatorId)
      .single()

    if (existing && existing.status !== 'rejected') {
      return NextResponse.json(
        { error: `Verification already ${existing.status}` },
        { status: 400 }
      )
    }

    // Update profile with initial data
    await (supabase as any)
      .from('profiles')
      .update({
        business_name: businessName,
        kitchen_type: kitchenType,
        needs_kitchen: needsKitchenAssistance || false,
        verification_status: 'pending'
      })
      .eq('id', creatorId)

    // Upsert verification
    const { data: verification, error } = await (supabase as any)
      .from('creator_verification')
      .upsert({
        creator_id: creatorId,
        business_name: businessName,
        business_permit: businessPermit || null,
        kitchen_type: kitchenType,
        kitchen_address: kitchenAddress || null,
        kitchen_lat: kitchenLat || null,
        kitchen_lng: kitchenLng || null,
        needs_kitchen_assistance: needsKitchenAssistance || false,
        status: 'pending',
        submitted_at: new Date().toISOString()
      }, { onConflict: 'creator_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ verification })

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/verification - Get verification status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')

    if (!creatorId) {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ 
        verification: {
          status: 'pending',
          business_name: 'My Kitchen',
          kitchen_type: 'commercial',
          mock: true
        },
        mock: true 
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ verification: null })
    }

    const { data: verification, error } = await (supabase as any)
      .from('creator_verification')
      .select('*')
      .eq('creator_id', creatorId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ verification: verification || null })

  } catch (error) {
    console.error('Get verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
