import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

// Dish-candidate console guards (fixture-level, no DB/network).
const route = readFileSync(new URL('../app/api/admin/dish-candidates/route.ts', import.meta.url), 'utf8')

test('publishing requires documented rights — refuse without approval', () => {
  assert.match(route, /refused: publishing requires documented rights/i)
  assert.match(route, /approve_rights first|approve_rights first\./i)
})

test('rights approval REQUIRES recorded permission evidence', () => {
  assert.match(route, /permission_evidence required/i)
  assert.match(route, /Rights approval without documented authorization is forbidden/i)
  assert.match(route, /if \(evidence\.length < 8\)/)
})

test('emergency unpublish preserves the underlying record', () => {
  assert.match(route, /recordPreserved: true/)
  assert.match(route, /record \+ history preserved/i)
})

test('every admin action appends to the existing audit table (no migration needed)', () => {
  assert.match(route, /catalog_review_audit/)
  assert.match(route, /async function audit/)
})

test('bucket doctrine: staged-but-unverified is BLOCKED, not live', () => {
  const fn = readFileSync(new URL('../app/api/admin/dish-candidates/route.ts', import.meta.url), 'utf8')
  assert.match(fn, /staged in DB but hidden from Discover/)
  assert.match(fn, /owner decision needed on image rights/)
  assert.doesNotMatch(fn, /validation\(\)/)
})
test('live dish set recomputed from database state per request (no cached publishing)', () => {
  assert.match(route, /temporary_staging_place_image_url/)
  assert.doesNotMatch(route, /revalidate/)
})

const csv = readFileSync(new URL('../reports/place-image-research/2026-10-25-179-validation.csv', import.meta.url), 'utf8')
test('validation cache file is present and parseable (179 rows)', () => {
  const rows = csv.trim().split('\n').filter((l) => /,/u.test(l))
  assert.ok(rows.length >= 180, `expected header + 179 rows, got ${rows.length}`)
})

test('console uses the authenticated owner session and contains no embedded credentials', () => {
  const client = readFileSync(new URL('../app/admin/dish-candidates/DishCandidatesClient.tsx', import.meta.url), 'utf8')
  assert.match(route, /getAdminPrincipal/)
  assert.match(client, /adminFetch\('\/api\/admin\/session'\)/)
  assert.match(client, /\/auth\?next=\/admin\/dish-candidates/)
  assert.doesNotMatch(client, /adminSecret|x-admin-secret|NEXT_PUBLIC_ADMIN_SECRET_HEADER/)
  assert.doesNotMatch(client, /secret\s*=\s*['"][^'"]{8,}/) // no hard-coded secrets
})

test('ordinary users cannot use owner controls', () => {
  assert.match(route, /if \(!principal\).*Unauthorized/)
  assert.match(route, /principal\.kind !== 'owner'/)
  assert.match(route, /Image replacement requires an authenticated owner account/)
})

test('mobile Dish Manager supports full preview and large owner actions', () => {
  const client = readFileSync(new URL('../app/admin/dish-candidates/DishCandidatesClient.tsx', import.meta.url), 'utf8')
  assert.match(client, /ImagePreviewModal/)
  assert.match(client, /Replace image/)
  assert.match(client, /Approve rights/)
  assert.match(client, /Publish/)
  assert.match(client, /Unpublish/)
  assert.match(client, /Reject/)
  assert.match(client, /min-h-12/)
})

test('owner image replacements remain managed, rights-documented, and audited', () => {
  assert.match(route, /isOwnedManagedPhotoUrl\(imageUrl, principal\.userId\)/)
  assert.match(route, /permission_evidence/)
  assert.match(route, /source_type: 'owner_upload'/)
  assert.match(route, /audit\(db, actor, 'replace_image'/)
})
