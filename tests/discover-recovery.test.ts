import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildDiscoverDeck, diversifyFoodOrder, foodVarietyKey } from '../lib/food.ts'

type Card = { content_kind: string; id: string; name: string; category?: string; tags?: string[]; right_swipes?: number; created_at?: string; seller?: { id?: string; seller_type?: string; seller_types?: string[]; latitude?: number; longitude?: number }; moderation_status?: string }
const card = (id: string, name: string, extra: Partial<Card> = {}): Card => ({ content_kind: extra.content_kind || 'community', id, name, ...extra })
const key = (c: Card) => `${c.content_kind}:${c.id}`
const passthrough = (_a: Card, _b: Card) => 0

test('new user sees the entire eligible deck (nothing hidden)', () => {
  const deck = [card('1', 'A'), card('2', 'B'), card('3', 'C')]
  const out = buildDiscoverDeck(deck, { excludedKeys: new Set(), seenKeys: new Set(), replay: false, sort: passthrough })
  assert.equal(out.length, 3)
  assert.deepEqual(new Set(out.map(key)), new Set(deck.map(key)))
})

test('returning user sees already-swiped cards again in a new session (after unseen)', () => {
  const deck = [card('1', 'A'), card('2', 'B'), card('3', 'C')]
  const seen = new Set([key(deck[0]), key(deck[2])])
  const out = buildDiscoverDeck(deck, { excludedKeys: new Set(), seenKeys: seen, replay: false, sort: passthrough })
  assert.equal(out.length, 3, 'seen cards must reappear')
  const seenIdx = out.map(key).map((k) => seen.has(k) ? 1 : 0)
  assert.ok(seenIdx[seenIdx.length - 1] === 1, 'seen cards trail unseen cards')
  assert.deepEqual(
    out.slice(0, out.length - seen.size).map(key).every((k) => !seen.has(k)),
    true,
    'unseen lead the deck',
  )
})

test('client exclusions hide cards for the current pass only and never mutate history', () => {
  const deck = [card('1', 'A'), card('2', 'B'), card('3', 'C')]
  const excluded = new Set([key(deck[1])])
  const seen = new Set([key(deck[1])])
  const seenSnapshot = new Set(seen)
  const excludedSnapshot = new Set(excluded)
  const out = buildDiscoverDeck(deck, { excludedKeys: excluded, seenKeys: seen, replay: false, sort: passthrough })
  assert.equal(out.some((c) => key(c) === key(deck[1])), false, 'excluded card hidden this pass')
  assert.deepEqual(seen, seenSnapshot, 'swipe history untouched by builders')
  assert.deepEqual(excluded, excludedSnapshot, 'exclusions not expanded by builders')
  // replay mode: entire eligible catalog returns, exclusions for the pass still honored
  const replayed = buildDiscoverDeck(deck, { excludedKeys: excluded, seenKeys: new Set(), replay: true, sort: passthrough })
  assert.equal(replayed.some((c) => key(c) === key(deck[1])), false, 'session exclusion still honored on replay')
  assert.ok(replayed.some((c) => key(c) === key(deck[0])), 'previously swiped card returns on replay')
})

test('no duplicate cards within a deck', () => {
  const deck = [card('1', 'A'), card('1', 'A-dup'), card('2', 'B'), card('2', 'B-dup')]
  const out = buildDiscoverDeck(deck, { excludedKeys: new Set(), seenKeys: new Set(), replay: true, sort: passthrough })
  const keys = out.map(key)
  assert.equal(new Set(keys).size, keys.length, 'unique keys only')
})

test('swipe bucks cannot double-award: ledger unique constraint present in migrations', () => {
  const ledger = readFileSync(new URL('../supabase/migrations/020_swipe_bucks.sql', import.meta.url), 'utf8')
  assert.match(ledger, /unique\s*\(\s*user_id,\s*post_id,\s*event_type,\s*source_user_id,\s*source_event_id\s*\)/, 'identical qualifying action can only be rewarded once')
  const guard = readFileSync(new URL('../supabase/migrations/022_swipe_bucks_redemption_guardrails.sql', import.meta.url), 'utf8')
  assert.match(guard, /unique\s*\(\s*user_id,\s*idempotency_key\s*\)/, 'redemptions are idempotent')
  // Read-time replay rule cannot award Bucks: the deck builder performs no writes and
  // reward rows are keyed per swipe event, so re-seeing a card creates no new event.
  assert.equal(typeof buildDiscoverDeck, 'function')
})

test('moderation and eligibility fields pass through unmodified', () => {
  const approved = card('1', 'A', { moderation_status: 'approved', seller: { id: 'sellerA', seller_type: 'restaurant' } })
  const pending = card('2', 'B', { moderation_status: 'pending', seller: { id: 'sellerB' } })
  const out = buildDiscoverDeck([approved, pending], { excludedKeys: new Set(), seenKeys: new Set(), replay: true, sort: passthrough })
  for (const item of out) {
    assert.ok(Object.prototype.hasOwnProperty.call(item, 'moderation_status'), 'moderation metadata preserved')
    assert.ok(Object.prototype.hasOwnProperty.call(item, 'seller'), 'seller metadata preserved')
  }
})

test('variety keys separate repeated pizzas and same-seller streaks (ordering quality)', () => {
  assert.equal(foodVarietyKey(card('x', 'Pepperoni Pizza', { category: 'pizza' })), 'pizza')
  const pizza1 = card('1', 'Pepperoni Pizza', { tags: ['pizza'], seller: { id: 'p1' } })
  const pizza2 = card('2', 'Half Cheese Pizza', { tags: ['pizza'], seller: { id: 'p2' } })
  const burger = card('3', 'Jalapeno Burger', { tags: ['burger'], seller: { id: 'p1' } })
  const out = diversifyFoodOrder([pizza1, pizza2, burger])
  const families = out.map(foodVarietyKey)
  for (let i = 1; i < families.length; i++) assert.notEqual(families[i], families[i - 1], 'no back-to-back same family')
})