import crypto from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(crypto.scrypt)

const SCRYPT_N = 16384
const SCRYPT_R = 16
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 32
const COOKIE_NAME = 'hs_staff_token'
const TOKEN_VERSION = 'v1'
const TOKEN_TTL_SECONDS = 8 * 60 * 60 // 8 hours

export function getStaffSecret(): string {
  if (process.env.HS_STAFF_SECRET) return process.env.HS_STAFF_SECRET
  const adminSecret = process.env.ADMIN_SECRET || process.env.HS_ADMIN_SECRET
  if (!adminSecret) {
    throw new Error('HS_STAFF_SECRET or ADMIN_SECRET must be set for staff auth')
  }
  return crypto.createHmac('sha256', adminSecret).update('hs-staff-secret-v1').digest('hex')
}

export async function hashStaffPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const derived = await scryptAsync(pin.normalize(), salt, SCRYPT_KEYLEN)
  return [
    TOKEN_VERSION,
    salt.toString('hex'),
    (derived as Buffer).toString('hex'),
  ].join(':')
}

export async function verifyStaffPin(pin: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false
  const parts = hash.split(':')
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  try {
    const derived = await scryptAsync(pin.normalize(), salt, expected.length)
    return crypto.timingSafeEqual(expected, derived as Buffer)
  } catch {
    return false
  }
}

export interface StaffTokenPayload {
  seller_id: string
  slug: string
  iat: number
  exp: number
  v: string
}

export function signStaffToken(sellerId: string, slug: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: StaffTokenPayload = {
    seller_id: sellerId,
    slug,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    v: TOKEN_VERSION,
  }
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'HS-STAFF' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', getStaffSecret()).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

export function verifyStaffToken(token: string | undefined): StaffTokenPayload | null {
  if (!token) return null
  const [header, body, signature] = token.split('.')
  if (!header || !body || !signature) return null
  const expected = crypto.createHmac('sha256', getStaffSecret()).update(`${header}.${body}`).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as StaffTokenPayload
    if (payload.v !== TOKEN_VERSION) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export { COOKIE_NAME, TOKEN_TTL_SECONDS }
