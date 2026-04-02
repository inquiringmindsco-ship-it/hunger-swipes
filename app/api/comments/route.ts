import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/comments - Add a comment to a photo
export async function POST(request: NextRequest) {
  try {
    const { photoId, userId, content, parentId } = await request.json()

    if (!photoId || !userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: photoId, userId, content' },
        { status: 400 }
      )
    }

    if (content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })
    }

    // Mock mode
    if (!isSupabaseConfigured()) {
      const mockComment = {
        id: 'mock-comment-' + Date.now(),
        photo_id: photoId,
        user_id: userId,
        content,
        parent_id: parentId || null,
        reply_count: 0,
        created_at: new Date().toISOString(),
        user: { username: '@mockuser', avatar_url: null },
        mock: true
      }
      return NextResponse.json({ comment: mockComment, mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ comment: { id: 'mock', content, mock: true }, mock: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comment, error } = await (supabase as any)
      .from('comments')
      .insert({
        photo_id: photoId,
        user_id: userId,
        content: content.trim(),
        parent_id: parentId || null
      })
      .select(`
        id,
        content,
        parent_id,
        reply_count,
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

    return NextResponse.json({ comment })

  } catch (error) {
    console.error('Comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/comments - Get comments for a photo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!photoId) {
      return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ comments: getMockComments(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ comments: getMockComments(), mock: true })
    }

    // Get top-level comments with replies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comments, error } = await (supabase as any)
      .from('comments')
      .select(`
        id,
        content,
        parent_id,
        reply_count,
        created_at,
        user:profiles!user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('photo_id', photoId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment: any) => {
        if (comment.reply_count > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: replies } = await (supabase as any)
            .from('comments')
            .select(`
              id,
              content,
              parent_id,
              reply_count,
              created_at,
              user:profiles!user_id (
                id,
                username,
                avatar_url
              )
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })
            .limit(5)
          
          return { ...comment, replies: replies || [] }
        }
        return { ...comment, replies: [] }
      })
    )

    return NextResponse.json({ comments: commentsWithReplies })

  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMockComments() {
  return [
    {
      id: 'mock-comment-1',
      content: 'This looks absolutely incredible! 😍',
      parent_id: null,
      reply_count: 2,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      user: { username: '@foodielover', avatar_url: null },
      replies: [
        {
          id: 'mock-reply-1',
          content: 'Right?! I need this in my life!',
          parent_id: 'mock-comment-1',
          reply_count: 0,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          user: { username: '@hungry_helpers', avatar_url: null }
        }
      ]
    },
    {
      id: 'mock-comment-2',
      content: 'What restaurant is this from?',
      parent_id: null,
      reply_count: 0,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      user: { username: '@stlfoodie', avatar_url: null },
      replies: []
    }
  ]
}