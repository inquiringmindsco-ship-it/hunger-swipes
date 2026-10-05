import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { safeNextRoute } from '@/lib/auth-routes'

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const supplied = Buffer.from(request.headers.get('x-img-adapter-secret') || '')
  const expected = Buffer.from(process.env.HUNGER_SWIPES_ADAPTER_SECRET || '')
  return supplied.length > 0 && supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function isOwnerEmail(value: string) {
  return (process.env.HUNGER_SWIPES_OWNER_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
    .includes(value.trim().toLowerCase())
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const next = safeNextRoute(typeof body.next === 'string' ? body.next : '/admin')
  if (!email || !isOwnerEmail(email)) return NextResponse.json({ error: 'Owner access denied' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 })
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  if (!appUrl) return NextResponse.json({ error: 'Application URL unavailable' }, { status: 503 })
  const redirect = `${appUrl}/auth/callback#token_hash=${encodeURIComponent(tokenHash)}&next=${encodeURIComponent(next)}`
  return NextResponse.json({ redirect }, { headers: { 'Cache-Control': 'private, no-store' } })
}
