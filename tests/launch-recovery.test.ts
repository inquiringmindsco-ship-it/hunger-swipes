import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('homepage has one canonical destination: Discover', () => {
  assert.match(read('../app/page.tsx'), /redirect\(['"]\/swipe['"]\)/)
})

test('root document includes the exact Impact site verification tag', () => {
  const layout = read('../app/layout.tsx')
  assert.match(layout, /name="impact-site-verification"/)
  assert.match(layout, /value: '98dcce70-830d-448b-ac0e-61702cd7f5dd'/)
})

test('mobile shell exposes exactly one primary navigation element', () => {
  const nav = read('../app/components/MobileNav.tsx')
  assert.equal((nav.match(/<nav\b/g) || []).length, 1)
  assert.match(nav, /data-testid="mobile-nav"/)
})

test('Build 15 profile keeps the two-column dashboard tiles', () => {
  const account = read('../app/account/page.tsx')
  assert.match(account, /Your dashboard/)
  assert.match(account, /grid grid-cols-2 gap-3/)
  for (const label of ['Food Profile', 'Preferences', 'Saved', 'Swipe Bucks', 'History']) {
    assert.match(account, new RegExp(`label=["']${label}["']`))
  }
})

test('Build 15 post flow keeps post type, place, address, photo, and dish details', () => {
  const post = read('../app/post/page.tsx')
  assert.match(post, /What are you posting\?/)
  assert.match(post, /Restaurant dish/)
  assert.match(post, /My own food/)
  assert.match(post, /places\/address-search/)
  assert.match(post, /handlePickPhoto/)
  assert.match(post, /dishName/)
})

test('right swipe countdown is visible, timed, and advances the deck', () => {
  const swipe = read('../app/swipe/page.tsx')
  assert.match(swipe, /MATCH_CONFIRMATION_SECONDS = 15/)
  assert.match(swipe, /Next dish in <span data-testid="countdown-number">\{matchCountdown\}<\/span>/)
  assert.match(swipe, /setMatchCountdown\(\(seconds\) => seconds - 1\)/)
  assert.match(swipe, /if \(matchCountdown <= 0\) \{\s*setMatchDish\(null\)/)
  assert.match(swipe, /setCurrentIndex\(\(index\) => index \+ 1\)/)
})

test('local discovery defaults to 3 miles and never expands silently', () => {
  const preferences = read('../lib/preferences.ts')
  const filters = read('../app/components/ui/FilterSheet.tsx')
  const swipe = read('../app/swipe/page.tsx')
  assert.match(preferences, /distanceMiles: 3/)
  assert.match(preferences, /\[1, 3, 5, 10, 15\]/)
  assert.match(filters, /Hunger Swipes will ask before expanding it/)
  assert.match(swipe, /Expand to \{nextRadius\} miles/)
  assert.match(swipe, /Only \{dishes\.length\} nearby/)
  assert.match(swipe, /Would you like us to look farther away\?/)
  assert.match(swipe, /Look up to \{nextRadius\} miles away/)
  assert.match(swipe, /if \(feedTab === 'nearby' && !replayMode\) return/)
  assert.match(swipe, /expandNearby\(true\)/)
})

test('following feed reuses follows, creator identities, blocks, and moderation', () => {
  const route = read('../app/api/dishes/route.ts')
  const swipe = read('../app/swipe/page.tsx')
  const food = read('../lib/food.ts')
  assert.match(route, /user_follows/)
  assert.match(route, /blocked_users/)
  assert.match(route, /blocker_user_id\.eq\.\$\{user\.id\},blocked_user_id\.eq\.\$\{user\.id\}/)
  assert.match(route, /mode === 'following'/)
  assert.match(route, /moderation_status', 'approved'/)
  assert.match(food, /creator_user_id: post\.user_id/)
  assert.match(swipe, /currentDish\.creatorUserId! : currentDish\.seller\.id/)
})

test('MAKE has an honest empty state and retired experiences redirect', () => {
  const swipe = read('../app/swipe/page.tsx')
  assert.match(swipe, /Recipes are coming soon/)
  assert.match(swipe, /No publish-ready recipes are available yet/)
  assert.match(read('../app/social/layout.tsx'), /redirect\('\/swipe'\)/)
  assert.match(read('../app/visits/layout.tsx'), /redirect\('\/history'\)/)
})

test('verified hours and outbound actions are connected without checkout', () => {
  const food = read('../lib/food.ts')
  const actions = read('../app/components/PlaceActions.tsx')
  const swipe = read('../app/swipe/page.tsx')
  assert.match(food, /hours_text: place\.hours/)
  assert.match(actions, /onAction\?\.\('order'\)/)
  assert.match(actions, /onAction\?\.\('google_maps'\)/)
  assert.match(swipe, /action === 'order' \? 'order_intent' : 'creator_engagement'/)
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

test('iOS Build 17 keeps release signing and static-export safeguards', () => {
  const project = read('../ios/App/App.xcodeproj/project.pbxproj')
  const info = read('../ios/App/App/Info.plist')
  const exporter = read('../scripts/build-ios-export.mjs')
  assert.match(project, /CURRENT_PROJECT_VERSION = 17;/)
  assert.match(project, /DEVELOPMENT_TEAM = 39A3BYR7NN;/)
  assert.match(project, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/)
  assert.match(info, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/)
  assert.match(exporter, /NEXT_PUBLIC_API_BASE_URL \|\|= 'https:\/\/hungerswipes\.com'/)
  assert.match(exporter, /dishPreviewDir/)
})

test('iOS production API permits only the Capacitor app origin', () => {
  const vercel = read('../vercel.json')
  assert.match(vercel, /"source": "\/api\/\(\.\*\)"/)
  assert.match(vercel, /"Access-Control-Allow-Origin", "value": "capacitor:\/\/localhost"/)
  assert.doesNotMatch(vercel, /"Access-Control-Allow-Origin", "value": "\*"/)
  assert.match(vercel, /Authorization, Content-Type/)
})

test('App Store icon is a 1024px PNG without an alpha channel', () => {
  const icon = readFileSync(new URL('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', import.meta.url))
  assert.equal(icon.readUInt32BE(16), 1024)
  assert.equal(icon.readUInt32BE(20), 1024)
  assert.ok(![4, 6].includes(icon[25]), 'PNG color type must not contain alpha')
})
