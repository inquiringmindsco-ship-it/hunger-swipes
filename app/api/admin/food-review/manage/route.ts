import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { safeRemoveStoredImage } from '@/lib/storage-cleanup'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  return secret === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 200)
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0)
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  let query = admin
    .from('community_food_posts')
    .select(`*, place:places!inner(id,name,location_text,status)`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('moderation_status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data || [] })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { postId, action, reason, adminUserId } = body
  if (!postId || !['remove'].includes(action)) {
    return NextResponse.json({ error: 'postId and action=remove required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data: post, error: postError } = await admin
    .from('community_food_posts')
    .select('id, photo_url, moderation_status')
    .eq('id', postId)
    .single()
  if (postError || !post) return NextResponse.json({ error: postError?.message || 'Post not found' }, { status: 404 })

  const { error: updateError } = await admin
    .from('community_food_posts')
    .update({
      status: 'removed',
      moderation_status: 'removed',
      deleted_at: new Date().toISOString(),
      deleted_by: adminUserId || null,
      deletion_reason: reason || 'admin_removal',
    })
    .eq('id', postId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await admin.from('moderation_decisions').insert({
    community_post_id: postId,
    previous_status: post.moderation_status,
    new_status: 'removed',
    moderator_id: adminUserId || null,
    decision_source: 'manual',
    reason: reason || 'Admin removed photo',
  })

  const cleanup = await safeRemoveStoredImage(post.photo_url)

  return NextResponse.json({ success: true, postId, storageRemoved: cleanup.removed, storageReason: cleanup.reason })
}
