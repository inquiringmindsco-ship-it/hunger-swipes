import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'
import { getRequestUser } from '@/lib/server-auth'
import { verifySsoToken } from '@/lib/sso'

export type AdminPrincipal =
  | { kind: 'owner'; userId: string; email: string }
  | { kind: 'legacy'; userId: null; email: null }
  | { kind: 'sso'; userId: null; email: string }

function ownerEmails() {
  return new Set(
    (process.env.HUNGER_SWIPES_OWNER_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
}

function safeSecretMatch(provided: string, expected: string) {
  if (!provided || !expected) return false
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
}

function ssoSessionFromRequest(request: NextRequest): { email: string } | null {
  const token = request.cookies.get('hs_sso_session')?.value
  if (!token) return null
  const payload = verifySsoToken(token)
  if (!payload || payload.target !== 'hunger-swipes') return null
  return { email: payload.email }
}

export async function getAdminPrincipal(request: NextRequest): Promise<AdminPrincipal | null> {
  const user = await getRequestUser(request)
  const email = user?.email?.trim().toLowerCase()
  if (user && email && ownerEmails().has(email)) {
    return { kind: 'owner', userId: user.id, email }
  }

  const sso = ssoSessionFromRequest(request)
  if (sso) {
    return { kind: 'sso', userId: null, email: sso.email }
  }

  const provided = request.headers.get('x-admin-secret') || ''
  const expected = process.env.ADMIN_SECRET || ''
  if (safeSecretMatch(provided, expected)) {
    return { kind: 'legacy', userId: null, email: null }
  }

  return null
}

export async function checkAdmin(request: NextRequest) {
  return Boolean(await getAdminPrincipal(request))
}
