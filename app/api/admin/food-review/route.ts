import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  return secret === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending_review'
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '20'), 1), 100)
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0)
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ data: posts, error }, { data: allToday, error: countError }] = await Promise.all([
    admin
      .from('community_food_posts')
      .select(`*, place:places!inner(id,name,location_text,status)`)
      .eq('status', 'active')
      .eq('moderation_status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    admin
      .from('community_food_posts')
      .select('moderation_status')
      .gte('created_at', todayStart.toISOString()),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (countError) console.error('count error', countError)

  const list = allToday || []
  return NextResponse.json({
    posts: posts || [],
    counts: {
      needs_review: list.filter((c: any) => c.moderation_status === 'pending_review').length,
      approved_today: list.filter((c: any) => c.moderation_status === 'approved').length,
      rejected_today: list.filter((c: any) => c.moderation_status === 'rejected').length,
    },
  })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { postId, action, reason, adminUserId } = body
  if (!postId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'postId and action (approve|reject) required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const { data: post, error: postError } = await admin
    .from('community_food_posts')
    .select('id, moderation_status')
    .eq('id', postId)
    .single()
  if (postError || !post) return NextResponse.json({ error: postError?.message || 'Post not found' }, { status: 404 })

  const { error: updateError } = await admin
    .from('community_food_posts')
    .update({
      moderation_status: newStatus,
      moderated_at: new Date().toISOString(),
      moderated_by: adminUserId || null,
      moderation_reason: reason || (action === 'approve' ? 'Admin approved' : 'Admin rejected'),
    })
    .eq('id', postId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await admin.from('moderation_decisions').insert({
    community_post_id: postId,
    previous_status: post.moderation_status,
    new_status: newStatus,
    moderator_id: adminUserId || null,
    decision_source: 'manual',
    reason: reason || (action === 'approve' ? 'Admin approved' : 'Admin rejected'),
  })

  return NextResponse.json({ success: true, postId, newStatus })
}
