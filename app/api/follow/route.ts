import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/follow - Follow a creator
export async function POST(request: NextRequest) {
  try {
    const { followerId, followingId } = await request.json()

    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: 'Missing required fields: followerId, followingId' },
        { status: 400 }
      )
    }

    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ 
        success: true, 
        following: true,
        mock: true,
        message: 'Followed successfully'
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ success: true, following: true, mock: true })
    }

    // Check if already following
    const { data: existing } = await (supabase as any)
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        following: true,
        message: 'Already following'
      })
    }

    // Create follow
    const { error } = await (supabase as any)
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      following: true,
      message: 'Followed successfully'
    })

  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/follow - Unfollow a creator
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const followerId = searchParams.get('followerId')
    const followingId = searchParams.get('followingId')

    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: 'Missing required fields: followerId, followingId' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ 
        success: true, 
        following: false,
        mock: true,
        message: 'Unfollowed successfully'
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ success: true, following: false, mock: true })
    }

    const { error } = await (supabase as any)
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      following: false,
      message: 'Unfollowed successfully'
    })

  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/follow - Get followers/following
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'followers'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ users: getMockUsers(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ users: getMockUsers(), mock: true })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    let query
    if (type === 'following') {
      query = (supabase as any)
        .from('follows')
        .select(`
          following:profiles!following_id (
            id,
            username,
            full_name,
            avatar_url,
            role,
            follower_count,
            post_count
          )
        `)
        .eq('follower_id', userId)
        .limit(limit)
    } else {
      query = (supabase as any)
        .from('follows')
        .select(`
          follower:profiles!follower_id (
            id,
            username,
            full_name,
            avatar_url,
            role,
            follower_count,
            post_count
          )
        `)
        .eq('following_id', userId)
        .limit(limit)
    }

    const { data: follows, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const users = follows?.map((f: any) => 
      type === 'following' ? f.following : f.follower
    ).filter(Boolean) || []

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Get follows error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockUsers() {
  return [
    { id: '1', username: '@stlfoodie', full_name: 'STL Foodie', avatar_url: null, role: 'creator', follower_count: 1234, post_count: 45 },
    { id: '2', username: '@meatlovers_mike', full_name: 'Mike the Meat', avatar_url: null, role: 'verified_creator', follower_count: 5678, post_count: 89 },
    { id: '3', username: '@healthyeats', full_name: 'Sarah Green', avatar_url: null, role: 'home_creator', follower_count: 892, post_count: 23 },
  ]
}
