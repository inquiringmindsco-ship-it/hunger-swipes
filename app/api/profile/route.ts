import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// GET /api/profile - Get profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const username = searchParams.get('username')

    if (!userId && !username) {
      return NextResponse.json({ error: 'Missing userId or username' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ profile: getMockProfile(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ profile: getMockProfile(), mock: true })
    }

    let query = (supabase as any)
      .from('profiles')
      .select('*')

    if (userId) {
      query = query.eq('id', userId)
    } else if (username) {
      query = query.eq('username', username)
    }

    const { data: profile, error } = await query.single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/profile - Update own profile
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Allowed fields to update
    const allowedUpdates = [
      'full_name', 'avatar_url', 'bio', 'commission_rate', 
      'role', 'has_kitchen', 'needs_kitchen', 'agreed_to_terms'
    ]
    
    const sanitizedUpdates: Record<string, any> = {}
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key]
      }
    }

    // Add terms agreement timestamp
    if (updates.agreed_to_terms) {
      sanitizedUpdates.terms_agreed_at = new Date().toISOString()
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ 
        profile: { id: userId, ...sanitizedUpdates, mock: true }, 
        mock: true 
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ profile: { id: userId, ...sanitizedUpdates, mock: true }, mock: true })
    }

    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockProfile() {
  return {
    id: 'mock-user-1',
    email: 'mock@example.com',
    full_name: 'Mock User',
    avatar_url: null,
    role: 'home_creator',
    username: '@mockuser',
    bio: 'Food lover sharing my favorite dishes!',
    commission_rate: 0.10,
    total_earnings: 125.50,
    pending_earnings: 45.00,
    follower_count: 234,
    following_count: 89,
    post_count: 12,
    verification_status: 'none',
    agreed_to_terms: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}
