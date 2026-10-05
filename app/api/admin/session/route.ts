import { NextRequest, NextResponse } from 'next/server'
import { getAdminPrincipal } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const principal = await getAdminPrincipal(request)
  if (!principal) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({
    authenticated: true,
    method: principal.kind,
    email: principal.kind === 'owner' ? principal.email : null,
  })
}
