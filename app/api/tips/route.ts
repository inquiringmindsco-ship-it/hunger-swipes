import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/tips - Send a tip to a creator
export async function POST(request: NextRequest) {
  try {
    const { senderId, creatorId, photoId, amount, message } = await request.json()

    if (!senderId || !creatorId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: senderId, creatorId, amount' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      const mockTip = {
        id: 'mock-tip-' + Date.now(),
        sender_id: senderId,
        creator_id: creatorId,
        photo_id: photoId || null,
        amount,
        message: message || null,
        status: 'completed',
        created_at: new Date().toISOString(),
        mock: true
      }
      return NextResponse.json({ tip: mockTip, mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Verify creator exists and can receive tips
    const { data: creator, error: creatorError } = await (supabase as any)
      .from('profiles')
      .select('id, role, verification_status, total_earnings, pending_earnings')
      .eq('id', creatorId)
      .single()

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Only scouts and home_creators can receive tips
    if (!['scout', 'home_creator'].includes(creator.role)) {
      return NextResponse.json(
        { error: 'This creator does not accept tips' },
        { status: 400 }
      )
    }

    // Create tip
    const { data: tip, error: tipError } = await (supabase as any)
      .from('tips')
      .insert({
        sender_id: senderId,
        creator_id: creatorId,
        photo_id: photoId || null,
        amount,
        message: message || null,
        status: 'completed'
      })
      .select()
      .single()

    if (tipError) {
      return NextResponse.json({ error: tipError.message }, { status: 500 })
    }

    // Update creator earnings (tips are 100% to creator)
    await (supabase as any)
      .from('profiles')
      .update({
        total_earnings: creator.total_earnings + amount,
        pending_earnings: creator.pending_earnings + amount
      })
      .eq('id', creatorId)

    // Insert earnings ledger
    await (supabase as any)
      .from('earnings')
      .insert({
        creator_id: creatorId,
        photo_id: photoId || null,
        tip_id: tip.id,
        order_id: tip.id,
        amount,
        source: 'tip'
      })

    return NextResponse.json({ tip })

  } catch (error) {
    console.error('Tip error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/tips - Get tips (for creator)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ tips: getMockTips(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ tips: getMockTips(), mock: true })
    }

    if (!creatorId) {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 })
    }

    const { data: tips, error } = await (supabase as any)
      .from('tips')
      .select(`
        id,
        amount,
        message,
        status,
        created_at,
        sender:profiles!sender_id (
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
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ tips: tips || [] })

  } catch (error) {
    console.error('Get tips error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockTips() {
  return [
    {
      id: 'mock-tip-1',
      amount: 5.00,
      message: 'This looks amazing! Proud to pay for this 🍔',
      status: 'completed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      sender: { username: '@foodielover', avatar_url: null },
      photo: { dish_name: 'Brisket Platter', image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200' }
    },
    {
      id: 'mock-tip-2',
      amount: 3.00,
      message: 'Support!',
      status: 'completed',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      sender: { username: '@stlfoodie', avatar_url: null },
      photo: null
    },
    {
      id: 'mock-tip-3',
      amount: 10.00,
      message: 'Best tacos I\'ve ever seen! 💰',
      status: 'completed',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      sender: { username: '@taco_tuesday', avatar_url: null },
      photo: { dish_name: 'Carnitas Tacos', image_url: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=200' }
    }
  ]
}
