import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { normalizeContentKind } from '@/lib/food'

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const contentKind = normalizeContentKind(body.contentKind)
  if (!contentKind || !body.contentId) return NextResponse.json({ error: 'Valid contentId and contentKind are required' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data, error } = await admin.rpc('record_food_impression', {
    p_actor_id: user.id, p_content_kind: contentKind, p_content_id: body.contentId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recorded: Boolean(data) })
}
