import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyStaffPin, signStaffToken, COOKIE_NAME, TOKEN_TTL_SECONDS } from '@/lib/staff-auth'

// Simple per-slug rate limit. In-memory only — sufficient for launch, not multi-instance.
const attempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(slug: string): boolean {
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 10
  const now = Date.now()
  const record = attempts.get(slug)
  if (!record || record.resetAt < now) {
    attempts.set(slug, { count: 1, resetAt: now + windowMs })
    return false
  }
  record.count++
  return record.count > maxAttempts
}

export async function POST(request: NextRequest) {
  try {
    const { slug, pin } = await request.json()
    if (!slug || typeof slug !== 'string' || !pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'Restaurant slug and PIN are required' }, { status: 400 })
    }

    if (isRateLimited(slug)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller, error } = await admin
      .from('sellers')
      .select('id, slug, staff_pin_hash')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!seller || !(await verifyStaffPin(pin, seller.staff_pin_hash))) {
      return NextResponse.json({ error: 'Invalid restaurant or PIN' }, { status: 401 })
    }

    const token = signStaffToken(seller.id, seller.slug)
    const response = NextResponse.json({ ok: true, slug: seller.slug }, { status: 200 })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_TTL_SECONDS,
    })
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
