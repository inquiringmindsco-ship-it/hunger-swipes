// Test script for Food Intent Platform backend APIs
// Run: node scripts/test-food-intent-backend.mjs
// This uses the local dev server or production URL.

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3002'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'hs-local-admin-2026-field-ready'

async function get(path, token) {
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { headers })
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function post(path, body, token, admin) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (admin) headers['x-admin-secret'] = ADMIN_SECRET
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function main() {
  console.log('Testing Food Intent Platform backend at', BASE)

  // Anonymous mode fetch
  const eat = await get('/api/dishes?discoveryMode=eat&mode=for-you&limit=5')
  console.log('EAT mode:', eat.status, 'dishes:', eat.body?.dishes?.length ?? 0)

  const make = await get('/api/dishes?discoveryMode=make&mode=for-you&limit=5')
  console.log('MAKE mode:', make.status, 'dishes:', make.body?.dishes?.length ?? 0)

  const explore = await get('/api/dishes?discoveryMode=explore&mode=for-you&limit=5')
  console.log('EXPLORE mode:', explore.status, 'dishes:', explore.body?.dishes?.length ?? 0)

  // Public profile
  const profile = await get('/api/profiles/nonexistenthandle')
  console.log('Profile 404:', profile.status)

  // Admin commerce config
  const cfg = await get('/api/admin/recipe-commerce-config', null, true)
  console.log('Admin config:', cfg.status, cfg.body?.config?.length ?? 0)

  // Admin purchases
  const purchases = await get('/api/admin/recipe-purchases', null, true)
  console.log('Admin purchases:', purchases.status)

  console.log('Backend smoke test complete.')
}

main().catch(console.error)
