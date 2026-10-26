import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in to block a creator' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const blockedUserId = typeof body.blockedUserId === 'string' ? body.blockedUserId : ''
  if (!/^[0-9a-f-]{36}$/i.test(blockedUserId) || blockedUserId === user.id) return NextResponse.json({ error: 'Invalid creator' }, { status: 400 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { error } = await admin.from('blocked_users').upsert({ blocker_user_id: user.id, blocked_user_id: blockedUserId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const blockedUserId = new URL(request.url).searchParams.get('userId') || ''
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { error } = await admin.from('blocked_users').delete().eq('blocker_user_id', user.id).eq('blocked_user_id', blockedUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
