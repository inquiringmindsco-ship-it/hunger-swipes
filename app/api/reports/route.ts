import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const REASONS = new Set(['not_food', 'offensive', 'spam', 'impersonation', 'other'])

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in to report content' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const contentId = typeof body.contentId === 'string' ? body.contentId : ''
  const reason = typeof body.reason === 'string' ? body.reason : ''
  const details = typeof body.details === 'string' ? body.details.trim().slice(0, 500) : null
  if (!/^[0-9a-f-]{36}$/i.test(contentId) || !REASONS.has(reason)) {
    return NextResponse.json({ error: 'Choose a valid reason' }, { status: 400 })
  }

  const { data: post, error: postError } = await admin.from('community_food_posts').select('id,user_id').eq('id', contentId).maybeSingle()
  if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (!post.user_id || post.user_id === user.id) return NextResponse.json({ error: 'You cannot report your own post' }, { status: 400 })

  const { error } = await admin.from('content_reports').upsert({
    reporter_user_id: user.id,
    content_kind: 'community',
    content_id: post.id,
    reported_user_id: post.user_id,
    reason,
    details,
    status: 'pending',
    reviewed_at: null,
    reviewed_by: null,
    resolution: null,
  }, { onConflict: 'reporter_user_id,content_kind,content_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Put reported content back into the existing admin food-review queue. The
  // approved feed only reads approved posts, so it is hidden while reviewed.
  const { error: queueError } = await admin
    .from('community_food_posts')
    .update({ moderation_status: 'pending_review', moderation_reason: `User report: ${reason}`, moderated_at: null, moderated_by: null })
    .eq('id', post.id)
    .eq('moderation_status', 'approved')
  if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
