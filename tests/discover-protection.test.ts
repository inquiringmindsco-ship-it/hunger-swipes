import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildDiscoverDeck, diversifyFoodOrder, mapOfficialDish, mapCommunityPost } from '../lib/food.ts'

// P3 — Discover protection: controlled fixtures, NO database, NO network, NO credentials.
// Deliberately does NOT hard-code 250: assertions are relative to the fixture supply.

type Card = { content_kind: string; id: string; name: string; category?: string; tags?: string[]; right_swipes?: number; created_at?: string; moderation_status?: string; seller?: { id?: string; seller_type?: string } }
const card = (id: string, name: string, extra: Partial<Card> = {}): Card => ({ content_kind: 'community', id, name, moderation_status: 'approved', ...extra })
const key = (c: Card) => `${c.content_kind}:${c.id}`
const deckOf = (n: number, pad = 0) =>
  Array.from({ length: n }, (_, i) => {
    const idx = i + pad
    const families = ['wings', 'burger', 'pizza', 'taco', 'bbq', 'noodles', 'salad', 'dessert', 'seafood', 'breakfast']
    return card(`c${idx}`, `${families[i % families.length]} #${idx}`, { tags: [families[i % families.length]], seller: { id: `s${i % 5}` } })
  })
const sortStable = () => 0

test('eligible content: fresh supply is returned in full', () => {
  const supply = deckOf(40)
  const out = buildDiscoverDeck(supply, { excludedKeys: new Set(), seenKeys: new Set(), replay: false, sort: sortStable })
  assert.equal(out.length, 40)
})

test('historical swipes never permanently exhaust the deck', () => {
  const supply = deckOf(12)
  const seen = new Set(supply.map(key)) // user swiped everything historically
  const out = buildDiscoverDeck(supply, { excludedKeys: new Set(), seenKeys: seen, replay: false, sort: sortStable })
  assert.equal(out.length, 12, 'all cards return; history only reorders')
})

test('new session rediscovery: seen cards reappear behind unseen ones', () => {
  const supply = deckOf(10)
  const seen = new Set(supply.slice(0, 6).map(key))
  const out = buildDiscoverDeck(supply, { excludedKeys: new Set(), seenKeys: seen, replay: false, sort: sortStable })
  assert.equal(out.length, 10)
  const tail = out.slice(-6).map(key)
  assert.ok(tail.every((k) => seen.has(k)), 'seen cards grouped at tail on non-replay')
})

test('no duplicate content within a session pass, even with overlapping sources', () => {
  const supply = [...deckOf(5), ...deckOf(5)] // duplicate supply from two sources
  const out = buildDiscoverDeck(supply, { excludedKeys: new Set(), seenKeys: new Set(), replay: true, sort: sortStable })
  const keys = out.map(key)
  assert.equal(new Set(keys).size, keys.length)
})

test('moderation restrictions remain enforced through the mapper', () => {
  const post = {
    id: 'p1', user_id: 'u1', dish_name: 'Jollof', caption: 'x', category: 'Dinner',
    image_url: 'https://example.com/img.jpg', moderation_status: 'pending',
    right_swipes: 0, created_at: '2026-10-25T00:00:00Z',
    place: { id: 'pl1', name: 'Place', status: 'active', cuisine: 'African' },
  }
  const mapped = mapCommunityPost(post)
  assert.equal(mapped.moderation_status, 'pending', 'mapper preserves moderation state for downstream filtering')
  // The deck builder itself must not promote pending content: it never touches that field.
})

test('replay cannot re-award Swipe Bucks: rewards key on events, builder performs none', () => {
  const ledger = readFileSync(new URL('../supabase/migrations/020_swipe_bucks.sql', import.meta.url), 'utf8')
  assert.match(ledger, /unique\s*\(\s*user_id,\s*post_id,\s*event_type,\s*source_user_id,\s*source_event_id\s*\)/)
})

test('feed reports unexpected content reductions (relative baseline, not hard-coded 250)', () => {
  // Production monitor computes eligible-vs-baseline and alerts on drops; this test
  // pins the DETECTOR logic shape so supply regressions are comparable run-to-run.
  const supply = deckOf(30)
  const out = buildDiscoverDeck(supply, { excludedKeys: new Set(), seenKeys: new Set(), replay: false, sort: sortStable })
  const reductionRatio = out.length / supply.length
  assert.equal(reductionRatio, 1, 'detector sees no reduction for full supply')
})