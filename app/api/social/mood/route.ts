import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/social/mood - Post a "What I'm craving" mood
export async function POST(request: NextRequest) {
  try {
    const { userId, content, isPublic = true } = await request.json()

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, content' },
        { status: 400 }
      )
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: 'Mood too long (max 280 chars)' },
        { status: 400 }
      )
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      const mockMood = {
        id: 'mock-mood-' + Date.now(),
        user_id: userId,
        content,
        is_public: isPublic,
        like_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
        user: { username: '@mockuser' },
        mock: true
      }
      return NextResponse.json({ mood: mockMood, mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      const mockMood = { id: 'mock', content, mock: true }
      return NextResponse.json({ mood: mockMood, mock: true })
    }

    const { data: mood, error } = await (supabase as any)
      .from('food_moods')
      .insert({
        user_id: userId,
        content: content.trim(),
        is_public: isPublic
      })
      .select(`
        id,
        content,
        is_public,
        like_count,
        comment_count,
        created_at,
        user:profiles!user_id (
          id,
          username,
          avatar_url
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mood })

  } catch (error) {
    console.error('Post mood error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/social/mood - Get food moods feed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ moods: getMockMoods(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ moods: getMockMoods(), mock: true })
    }

    const { data: moods, error } = await (supabase as any)
      .from('food_moods')
      .select(`
        id,
        content,
        is_public,
        like_count,
        comment_count,
        created_at,
        user:profiles!user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ moods: moods || [] })

  } catch (error) {
    console.error('Get moods error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockMoods() {
  return [
    {
      id: 'mock-mood-1',
      content: 'I could seriously go for some spicy tacos right now 🌮🔥',
      is_public: true,
      like_count: 24,
      comment_count: 5,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      user: { username: '@foodielover', avatar_url: null }
    },
    {
      id: 'mock-mood-2',
      content: 'Brunch tomorrow with friends. Pancakes are calling my name 🥞',
      is_public: true,
      like_count: 18,
      comment_count: 3,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      user: { username: '@brunch_king', avatar_url: null }
    },
    {
      id: 'mock-mood-3',
      content: 'Late night sushi craving hits different 🍣',
      is_public: true,
      like_count: 42,
      comment_count: 8,
      created_at: new Date(Date.now() - 14400000).toISOString(),
      user: { username: '@sushi_sensei', avatar_url: null }
    }
  ]
}
