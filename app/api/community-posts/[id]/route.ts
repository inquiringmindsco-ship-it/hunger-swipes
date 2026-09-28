import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { safeRemoveStoredImage } from '@/lib/storage-cleanup'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data: post, error: postError } = await admin
    .from('community_food_posts')
    .select('id, user_id, photo_url, moderation_status')
    .eq('id', id)
    .single()

  if (postError || !post) return NextResponse.json({ error: postError?.message || 'Post not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 })

  const { error: updateError } = await admin
    .from('community_food_posts')
    .update({
      status: 'removed',
      moderation_status: 'removed',
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      deletion_reason: 'user_delete',
    })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await admin.from('moderation_decisions').insert({
    community_post_id: id,
    previous_status: post.moderation_status,
    new_status: 'removed',
    moderator_id: user.id,
    decision_source: 'manual',
    reason: 'User deleted their own post',
  })

  const cleanup = await safeRemoveStoredImage(post.photo_url)

  return NextResponse.json({ success: true, id, storageRemoved: cleanup.removed, storageReason: cleanup.reason })
}
