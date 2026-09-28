// Hunger Swipes — Food Intent Platform Phase C: Stripe test-mode commerce proof.
// Run only when STRIPE_SECRET_KEY (sk_test_...) and STRIPE_WEBHOOK_SECRET are available.
// Uses Stripe test cards and test connected accounts. NO real money.
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
try {
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = proces…_KEY
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase env vars')
  process.exit(1)
}
if (!STRIPE_SECRET || !STRIPE_SECRET.startsWith('sk_test_')) {
  console.error('❌ STRIPE_SECRET_KEY must be a Stripe TEST secret key (sk_test_...)')
  process.exit(1)
}
if (!WEBHOOK_SECRET || !WEBHOOK_SECRET.startsWith('whsec_')) {
  console.error('❌ STRIPE_WEBHOOK_SECRET must be set (whsec_...)')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2025-03-31.basil' })
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  return { status: res.status, body }
}

async function signInTestUser(email, password) {
  const { data, error } = await admin.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session.access_token
}

async function createTestUser(email) {
  const password = `Test-${Date.now()}!`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return { user: data.user, password, token: await signInTestUser(email, password) }
}

let testUser = null
let accounts = []
let sellers = []
let recipes = []

const TEST_CASES = [
  { name: 'Fixed $4.99', recipe_type: 'fixed_price', price: 4.99, min: null },
  { name: 'Fixed $9.99', recipe_type: 'fixed_price', price: 9.99, min: null },
  { name: 'Proud $5', recipe_type: 'proud_to_pay', price: 5.0, min: 5.0 },
  { name: 'Proud $10', recipe_type: 'proud_to_pay', price: 10.0, min: 5.0 },
]

async function setup() {
  const email = `sentinel-stripe-${Date.now()}@example.com`
  testUser = await createTestUser(email)
  console.log('Test user', testUser.user.id)

  for (const tc of TEST_CASES) {
    const account = await stripe.accounts.create({
      type: 'standard',
      country: 'US',
      capabilities: { transfers: { requested: true } },
      metadata: { test_case: tc.name },
    })
    accounts.push(account)
    console.log(`Created Stripe account for ${tc.name}:`, account.id)

    const slug = `stripe-test-${tc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const { data: seller } = await admin
      .from('sellers')
      .insert({
        owner_user_id: testUser.user.id,
        slug,
        business_name: `Stripe Test ${tc.name}`,
        seller_type: 'recipe_creator',
        seller_types: ['recipe_creator'],
        location_text: 'St. Louis, MO',
        status: 'active',
        verification_status: 'approved',
        stripe_account_id: account.id,
        stripe_connect_status: 'ready',
      })
      .select()
      .single()
    sellers.push(seller)

    const { data: dish } = await admin
      .from('dishes')
      .insert({
        seller_id: seller.id,
        name: `Test Dish ${tc.name}`,
        description: 'Stripe commerce test dish',
        photo_url: 'https://hwqvfltopgoxocvpbexq.supabase.co/storage/v1/object/public/dish-photos/2555d253-089e-4043-9be9-63bd4cd25fd4/dish-photos/1790212592124-5wbris5mobh.jpg',
        price: tc.price,
        availability: 'available',
        status: 'active',
        recipe_available: true,
        recipe_access_type: tc.recipe_type === 'free' ? 'preview' : 'purchase',
        recipe_price: tc.price,
      })
      .select()
      .single()

    const { data: recipe } = await admin
      .from('recipes')
      .insert({
        dish_id: dish.id,
        seller_id: seller.id,
        creator_user_id: testUser.user.id,
        title: `Test Recipe ${tc.name}`,
        description: 'Stripe test recipe',
        ingredients: ['test'],
        instructions: ['test'],
        price: tc.price,
        recipe_type: tc.recipe_type,
        min_proud_to_pay_amount: tc.min,
        status: 'active',
        published: true,
      })
      .select()
      .single()
    recipes.push(recipe)
    console.log(`Created ${tc.name} recipe`, recipe.id)
  }

  await sleep(500)
}

async function confirmWithTestCard(clientSecret) {
  // Use Stripe's public test publishable key is not needed for server-side confirmation.
  // We create a payment method and confirm the PaymentIntent directly with the secret key.
  const pm = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2030,
      cvc: '123',
    },
  })
  const pi = await stripe.paymentIntents.confirm(clientSecret.split('_secret')[0], {
    payment_method: pm.id,
  })
  return pi
}

function makeWebhookEvent(pi) {
  const payload = {
    id: `evt_${Date.now()}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    data: { object: pi },
    created: Math.floor(Date.now() / 1000),
  }
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(payload),
    secret: WEBHOOK_SECRET,
  })
  return { payload: JSON.stringify(payload), signature: sig }
}

async function runTestCases() {
  const results = []
  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i]
    const recipe = recipes[i]
    console.log(`\n🧪 ${tc.name}`)
    try {
      // 1. Call purchase endpoint
      const purchaseRes = await api('/api/recipes/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUser.token}`,
        },
        body: JSON.stringify({
          recipe_id: recipe.id,
          proud_to_pay_amount: tc.recipe_type === 'proud_to_pay' ? tc.price : undefined,
        }),
      })
      if (purchaseRes.status !== 201) throw new Error(`purchase failed: ${JSON.stringify(purchaseRes.body)}`)
      const { client_secret, economics, purchase } = purchaseRes.body
      console.log('  Purchase intent created', purchase.id)

      // 2. Confirm with Stripe test card
      const pi = await confirmWithTestCard(client_secret)
      if (pi.status !== 'succeeded') throw new Error(`PaymentIntent status ${pi.status}: ${pi.last_payment_error?.message}`)
      console.log('  PaymentIntent succeeded', pi.id)

      // 3. Simulate webhook
      const { payload, signature } = makeWebhookEvent(pi)
      const webhookRes = await api('/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: payload,
      })
      if (webhookRes.status !== 200) throw new Error(`webhook failed: ${JSON.stringify(webhookRes.body)}`)
      console.log('  Webhook settled')

      // 4. Verify entitlement and economics
      const { data: entitlement } = await admin
        .from('recipe_entitlements')
        .select('*')
        .eq('recipe_id', recipe.id)
        .eq('user_id', testUser.user.id)
        .maybeSingle()
      if (!entitlement || entitlement.status !== 'active') throw new Error('Entitlement not active')

      const { data: settled } = await admin
        .from('recipe_purchases')
        .select('*')
        .eq('id', purchase.id)
        .single()

      results.push({
        name: tc.name,
        ok: true,
        price_cents: settled.price_cents,
        platform_fee_cents: settled.platform_fee_cents,
        creator_payout_cents: settled.creator_payout_cents,
        platform_fee_percent: economics.platform_fee_percent,
        creator_share_percent: economics.creator_share_percent,
        entitlement_status: entitlement.status,
      })
      console.log(`  ✅ ${tc.name} — price ${settled.price_cents}c, platform ${settled.platform_fee_cents}c, creator ${settled.creator_payout_cents}c`)
    } catch (err) {
      console.error(`  ❌ ${tc.name}:`, err.message)
      results.push({ name: tc.name, ok: false, error: err.message })
    }
  }
  return results
}

async function cleanup() {
  for (const recipe of recipes) {
    await admin.from('recipe_purchases').delete().eq('recipe_id', recipe.id)
    await admin.from('recipe_entitlements').delete().eq('recipe_id', recipe.id)
    await admin.from('recipes').delete().eq('id', recipe.id)
  }
  for (const seller of sellers) {
    await admin.from('dishes').delete().eq('seller_id', seller.id)
    await admin.from('sellers').delete().eq('id', seller.id)
  }
  if (testUser) await admin.auth.admin.deleteUser(testUser.user.id)
  for (const account of accounts) {
    try { await stripe.accounts.del(account.id) } catch {}
  }
  console.log('Cleaned up')
}

async function main() {
  try {
    await setup()
    const results = await runTestCases()
    console.log('\n=== Economic Proof ===')
    for (const r of results) {
      if (r.ok) {
        console.log(`${r.name}: price=${r.price_cents}c platform=${r.platform_fee_cents}c (${r.platform_fee_percent}%) creator=${r.creator_payout_cents}c (${r.creator_share_percent}%)`)
      } else {
        console.log(`${r.name}: FAILED — ${r.error}`)
      }
    }
    if (results.some((r) => !r.ok)) process.exitCode = 1
  } catch (err) {
    console.error('Fatal:', err)
    process.exitCode = 1
  } finally {
    await cleanup()
  }
}

main()
