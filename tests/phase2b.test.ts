import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const adminAuth = readFileSync(new URL('../lib/admin-auth.ts', import.meta.url), 'utf8')
const adminUi = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8')
const adapterRoute = readFileSync(new URL('../app/api/owner-adapter/route.ts', import.meta.url), 'utf8')
const adapter = readFileSync(new URL('../lib/owner-adapter.ts', import.meta.url), 'utf8')
const sellerRoute = readFileSync(new URL('../app/api/admin/sellers/route.ts', import.meta.url), 'utf8')
const moderationRoute = readFileSync(new URL('../app/api/admin/food-review/route.ts', import.meta.url), 'utf8')
const sessionLink = readFileSync(new URL('../app/api/owner-session-link/route.ts', import.meta.url), 'utf8')
const authCallback = readFileSync(new URL('../app/auth/callback/page.tsx', import.meta.url), 'utf8')

test('owner admin authorization uses a verified Supabase identity and explicit allowlist', () => {
  assert.match(adminAuth, /getRequestUser\(request\)/)
  assert.match(adminAuth, /HUNGER_SWIPES_OWNER_EMAILS/)
  assert.match(adminAuth, /ownerEmails\(\)\.has\(email\)/)
  assert.match(sellerRoute, /await checkAdmin\(request\)/)
  assert.match(adminUi, /adminFetch\('\/api\/admin\/session'\)/)
})

test('legacy shared secret remains a timing-safe compatibility fallback', () => {
  assert.match(adminAuth, /timingSafeEqual/)
  assert.match(adminAuth, /process\.env\.ADMIN_SECRET/)
  assert.match(adminUi, /Temporary compatibility access/)
})

test('moderation actions attribute the authenticated owner identity', () => {
  assert.match(moderationRoute, /getAdminPrincipal\(request\)/)
  assert.match(moderationRoute, /moderated_by: principal\.userId/)
  assert.doesNotMatch(moderationRoute, /adminUserId/)
})

test('owner adapter is narrow, read-only, authenticated, masked, and does not count places as businesses', () => {
  assert.match(adapterRoute, /x-img-adapter-secret/)
  assert.match(adapterRoute, /timingSafeEqual/)
  assert.match(adapterRoute, /Cache-Control.*no-store/)
  assert.match(adapter, /from\('sellers'\)/)
  assert.match(adapter, /from\('business_submissions'\)/)
  assert.match(adapter, /from\('place_claims'\)/)
  assert.match(adapter, /from\('community_food_posts'\)/)
  assert.match(adapter, /recordType: 'Moderation item'/)
  assert.doesNotMatch(adapter, /from\('places'\)\.select\('id'.*count/)
  assert.match(adapter, /maskEmail/)
  assert.match(adapter, /maskPhone/)
  assert.doesNotMatch(adapterRoute, /console\.(log|info).*query/)
})

test('short and unknown searches legitimately return empty result arrays', () => {
  assert.match(adapter, /if \(query\.length < 2\) return \[\]/)
  assert.match(adapter, /\.slice\(0, limit\)/)
})

test('IMG owner handoff is allowlisted, short-lived through Supabase, and keeps its token out of request logs', () => {
  assert.match(sessionLink, /isOwnerEmail\(email\)/)
  assert.match(sessionLink, /auth\.admin\.generateLink/)
  assert.match(sessionLink, /#token_hash=/)
  assert.match(authCallback, /window\.location\.hash/)
  assert.match(authCallback, /verifyOtp/)
})
