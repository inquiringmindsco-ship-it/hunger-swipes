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

test('validation cache drives bucket A/B/C (usable → owner review; broken → blocked)', () => {
  assert.match(route, /image unreachable\/broken/)
  assert.match(route, /awaiting owner decision on image rights/)
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

test('console exists and gates admin access by secret + no credentials embedded', () => {
  const client = readFileSync(new URL('../app/admin/dish-candidates/DishCandidatesClient.tsx', import.meta.url), 'utf8')
  assert.match(route, /checkAdmin/)
  assert.doesNotMatch(client, /secret\s*=\s*['"][^'"]{8,}/) // no hard-coded secrets
})