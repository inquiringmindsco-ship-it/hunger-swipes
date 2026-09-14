import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { normalizeContentKind } from '@/lib/food'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const contentId = body.contentId || body.dishId
    const contentKind = normalizeContentKind(body.contentKind || 'official')
    const { direction } = body
    if (!contentId || !contentKind || !['left', 'right'].includes(direction)) {
      return NextResponse.json({ error: 'Valid contentId, contentKind, and direction are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin.rpc('record_food_swipe', {
      p_actor_id: user.id, p_content_kind: contentKind, p_content_id: contentId, p_direction: direction,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Active food content not found' }, { status: 404 })
    return NextResponse.json({ success: true, saved: direction === 'right' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
