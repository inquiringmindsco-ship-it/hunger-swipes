import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('homepage has one canonical destination: Discover', () => {
  assert.match(read('../app/page.tsx'), /redirect\(['"]\/swipe['"]\)/)
})

test('mobile shell exposes exactly one primary navigation element', () => {
  const nav = read('../app/components/MobileNav.tsx')
  assert.equal((nav.match(/<nav\b/g) || []).length, 1)
  assert.match(nav, /data-testid="mobile-nav"/)
})

test('right swipe countdown is visible, timed, and advances the deck', () => {
  const swipe = read('../app/swipe/page.tsx')
  assert.match(swipe, /RIGHT_SWIPE_COUNTDOWN_SECONDS = 5/)
  assert.match(swipe, /data-testid="countdown-number"/)
  assert.match(swipe, /setMatchCountdown\(\(seconds\) => seconds - 1\)/)
  assert.match(swipe, /if \(matchCountdown <= 1\) doAdvance\(\)/)
  assert.match(swipe, /setCurrentIndex\(\(index\) => index \+ 1\)/)
})

test('anonymous right swipes browse without writing or forced authentication', () => {
  const swipe = read('../app/swipe/page.tsx')
  assert.match(swipe, /if \(!user\) \{ window\.setTimeout\(\(\) => finishAdvance\(dish, direction, false\), 350\); return \}/)
  assert.doesNotMatch(swipe, /router\.push\(['"]\/auth/)
})

test('Swipe Bucks and replay remain idempotent', () => {
  const ledger = read('../supabase/migrations/020_swipe_bucks.sql')
  const guard = read('../supabase/migrations/022_swipe_bucks_redemption_guardrails.sql')
  assert.match(ledger, /unique\s*\(\s*user_id,\s*post_id,\s*event_type,\s*source_user_id,\s*source_event_id\s*\)/)
  assert.match(guard, /unique\s*\(\s*user_id,\s*idempotency_key\s*\)/)
})
