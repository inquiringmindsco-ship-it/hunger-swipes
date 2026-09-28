// Temporary test seed for Food Intent Platform.
// Creates an active test seller + dish + optional recipe for a known user,
// runs API smoke tests, then deletes the seeded rows.
// Run against local dev server: npm run dev (port 3000)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (Next.js app style)
const envPath = resolve(process.cwd(), '.env.local')
try {
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_OWNER = process.env.TEST_OWNER_ID || '7a3c6a47-f135-4c73-8a19-577ca62243e6'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'hs-local-admin-2026-field-ready'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  return { status: res.status, body }
}

let seller = null
let sellerId = null
let dishId = null
let recipeId = null
let handleId = null
let profileId = null

async function seed() {
  const slug = `sentinel-test-${Date.now()}`
  const { data: sellerRow, error: sErr } = await admin
    .from('sellers')
    .insert({
      owner_user_id: TEST_OWNER,
      slug,
      business_name: 'Sentinel Test Eatery',
      seller_type: 'restaurant',
      seller_types: ['restaurant'],
      location_text: 'St. Louis, MO',
      status: 'active',
      verification_status: 'approved',
    })
    .select()
    .single()
  if (sErr) throw sErr
  seller = sellerRow
  sellerId = seller.id
  console.log('Created seller', sellerId)

  const { data: dish, error: dErr } = await admin
    .from('dishes')
    .insert({
      seller_id: sellerId,
      name: 'Sentinel Test Wings',
      description: 'Spicy test wings for food intent verification',
      photo_url: 'https://hwqvfltopgoxocvpbexq.supabase.co/storage/v1/object/public/dish-photos/2555d253-089e-4043-9be9-63bd4cd25fd4/dish-photos/1790212592124-5wbris5mobh.jpg',
      price: 12.99,
      availability: 'available',
      status: 'active',
      category: 'Wings',
      tags: ['spicy', 'test'],
    })
    .select()
    .single()
  if (dErr) throw dErr
  dishId = dish.id
  console.log('Created dish', dishId)

  const { data: recipe, error: rErr } = await admin
    .from('recipes')
    .insert({
      dish_id: dishId,
      seller_id: sellerId,
      creator_user_id: TEST_OWNER,
      title: 'Sentinel Test Wing Recipe',
      description: 'Make these wings at home',
      ingredients: ['wings', 'spice'],
      instructions: ['Season', 'Bake'],
      price: 4.99,
      recipe_type: 'fixed_price',
      status: 'active',
      published: true,
    })
    .select()
    .single()
  if (rErr) throw rErr
  recipeId = recipe.id
  console.log('Created recipe', recipeId)

  // Sync dish recipe flags via the same logic the API uses
  await admin
    .from('dishes')
    .update({ recipe_available: true, recipe_access_type: 'purchase', recipe_price: 4.99 })
    .eq('id', dishId)

  // Create handle + profile for public profile test
  const { data: handle, error: hErr } = await admin
    .from('handles')
    .insert({ handle: slug, owner_type: 'seller', owner_id: sellerId })
    .select()
    .single()
  if (!hErr) {
    handleId = handle.id
    console.log('Created handle', handle.handle)
  } else {
    console.log('Handle creation skipped or failed', hErr.message)
  }

  const { data: profile, error: pErr } = await admin
    .from('food_profiles')
    .insert({ owner_type: 'seller', owner_id: sellerId, bio: 'Test food profile' })
    .select()
    .single()
  if (!pErr) {
    profileId = profile.id
    console.log('Created profile', profileId)
  } else {
    console.log('Profile creation skipped or failed', pErr.message)
  }

  await sleep(500)
}

async function test() {
  const tests = []
  const check = async (label, fn) => {
    try {
      const r = await fn()
      console.log('✅', label, r.status)
      tests.push({ label, ok: true, status: r.status })
    } catch (err) {
      console.log('❌', label, err.message)
      tests.push({ label, ok: false, error: err.message })
    }
  }

  await check('EAT mode returns seeded dish', async () => {
    const r = await api(`/api/dishes?discoveryMode=eat&mode=for-you&limit=5`)
    if (r.status !== 200) throw new Error(JSON.stringify(r.body))
    const found = r.body.dishes?.find((d) => d.id === dishId)
    if (!found) throw new Error('Seeded dish not in EAT results')
    return r
  })

  await check('MAKE mode returns recipe dish', async () => {
    const r = await api(`/api/dishes?discoveryMode=make&mode=for-you&limit=5`)
    if (r.status !== 200) throw new Error(JSON.stringify(r.body))
    const found = r.body.dishes?.find((d) => d.id === dishId)
    if (!found) throw new Error('Seeded dish not in MAKE results')
    return r
  })

  await check('EXPLORE mode returns content', async () => {
    const r = await api(`/api/dishes?discoveryMode=explore&mode=for-you&limit=5`)
    if (r.status !== 200) throw new Error(JSON.stringify(r.body))
    return r
  })

  await check('Public profile by slug', async () => {
    const res = await fetch(`${BASE}/${seller.slug}`)
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
    return { status: res.status, body: null }
  })

  await check('Recipe preview API', async () => {
    const r = await api(`/api/recipes/${recipeId}?mode=preview`)
    if (r.status !== 200) throw new Error(JSON.stringify(r.body))
    if (!r.body.recipe?.title) throw new Error('No preview title')
    return r
  })

  await check('Recipe unlock without auth fails', async () => {
    const r = await api(`/api/recipes/${recipeId}?mode=unlock`)
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`)
    return r
  })

  await check('Admin recipes endpoint', async () => {
    const r = await api('/api/admin/recipes', {
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
    if (r.status !== 200) throw new Error(JSON.stringify(r.body))
    return r
  })

  await check('Admin sellers endpoint', async () => {
    const r = await api('/api/admin/sellers', {
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
    if (r.status !== 200) throw new Error(JSON.stringify(r.body))
    return r
  })

  return tests
}

async function cleanup() {
  if (recipeId) {
    await admin.from('recipe_purchases').delete().eq('recipe_id', recipeId)
    await admin.from('recipe_entitlements').delete().eq('recipe_id', recipeId)
    await admin.from('recipes').delete().eq('id', recipeId)
  }
  if (dishId) await admin.from('dishes').delete().eq('id', dishId)
  if (sellerId) await admin.from('sellers').delete().eq('id', sellerId)
  if (handleId) await admin.from('handles').delete().eq('id', handleId)
  if (profileId) await admin.from('food_profiles').delete().eq('id', profileId)
  console.log('Cleaned up seeded rows')
}

async function main() {
  try {
    await seed()
    const tests = await test()
    const failed = tests.filter((t) => !t.ok)
    if (failed.length) {
      console.log('\nFailed tests:', failed)
      process.exitCode = 1
    } else {
      console.log('\nAll tests passed')
    }
  } catch (err) {
    console.error('Seed/test error:', err)
    process.exitCode = 1
  } finally {
    await cleanup()
  }
}

main()
