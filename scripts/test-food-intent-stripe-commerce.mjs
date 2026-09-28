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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const ADMIN_SECRET = process.env.ADMIN_SECRET
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

if (process.env.STRIPE_TEST_CONFIRM !== 'HUNGER_SWIPES_TEST_ONLY') {
  console.error('❌ Set STRIPE_TEST_CONFIRM=HUNGER_SWIPES_TEST_ONLY to allow temporary test-data creation')
  process.exit(1)
}

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
if (!ADMIN_SECRET) {
  console.error('❌ Missing ADMIN_SECRET (needed to exercise the app refund endpoint)')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET)
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
let account = null
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

  account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { purpose: 'hunger_swipes_automated_test' },
  })
  console.log('Created test Express account', account.id)

  for (const tc of TEST_CASES) {
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
  const pi = await stripe.paymentIntents.confirm(clientSecret.split('_secret')[0], {
    payment_method: 'pm_card_visa',
  })
  return pi
}

function makeWebhookEvent(type, object) {
  const payload = {
    id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    object: 'event',
    livemode: false,
    type,
    data: { object },
    created: Math.floor(Date.now() / 1000),
  }
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(payload),
    secret: WEBHOOK_SECRET,
  })
  return { payload: JSON.stringify(payload), signature: sig }
}

async function sendWebhook(type, object, signatureOverride) {
  const { payload, signature } = makeWebhookEvent(type, object)
  return api('/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signatureOverride || signature,
    },
    body: payload,
  })
}

async function verifyDecline(recipe) {
  const purchaseRes = await api('/api/recipes/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testUser.token}` },
    body: JSON.stringify({ recipe_id: recipe.id }),
  })
  if (purchaseRes.status !== 201) throw new Error(`decline setup failed: ${JSON.stringify(purchaseRes.body)}`)
  const piId = purchaseRes.body.client_secret.split('_secret')[0]
  try {
    await stripe.paymentIntents.confirm(piId, { payment_method: 'pm_card_visa_chargeDeclined' })
  } catch {}
  const failedPi = await stripe.paymentIntents.retrieve(piId)
  const webhookRes = await sendWebhook('payment_intent.payment_failed', failedPi)
  if (webhookRes.status !== 200) throw new Error(`failed-payment webhook failed: ${JSON.stringify(webhookRes.body)}`)
  const { data: failedPurchase } = await admin.from('recipe_purchases').select('status').eq('id', purchaseRes.body.purchase.id).single()
  const { count } = await admin.from('recipe_entitlements').select('id', { count: 'exact', head: true }).eq('recipe_purchase_id', purchaseRes.body.purchase.id)
  if (failedPurchase?.status !== 'failed' || count !== 0) throw new Error('Declined payment state was not enforced')
  console.log('  ✅ Decline leaves purchase failed and entitlement locked')
}

async function runTestCases() {
  const results = []
  await verifyDecline(recipes[0])

  const invalidSignature = await sendWebhook('payment_intent.succeeded', { id: 'pi_invalid' }, 'invalid')
  if (invalidSignature.status !== 400) throw new Error('Webhook accepted an invalid signature')
  console.log('  ✅ Invalid webhook signature rejected')

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
      const webhookRes = await sendWebhook('payment_intent.succeeded', pi)
      if (webhookRes.status !== 200) throw new Error(`webhook failed: ${JSON.stringify(webhookRes.body)}`)
      const replayRes = await sendWebhook('payment_intent.succeeded', pi)
      if (replayRes.status !== 200) throw new Error(`webhook replay failed: ${JSON.stringify(replayRes.body)}`)
      console.log('  Webhook settled')

      // 4. Verify entitlement and economics
      const { data: entitlement } = await admin
        .from('recipe_entitlements')
        .select('*')
        .eq('recipe_id', recipe.id)
        .eq('user_id', testUser.user.id)
        .maybeSingle()
      if (!entitlement || entitlement.status !== 'active') throw new Error('Entitlement not active')

      const { count: entitlementCount } = await admin
        .from('recipe_entitlements')
        .select('id', { count: 'exact', head: true })
        .eq('recipe_purchase_id', purchase.id)
      if (entitlementCount !== 1) throw new Error(`Webhook idempotency failed: ${entitlementCount} entitlements`)

      const stripePi = await stripe.paymentIntents.retrieve(pi.id)
      const destination = stripePi.transfer_data?.destination
      const destinationId = typeof destination === 'string' ? destination : destination?.id
      if (destinationId !== account.id) throw new Error(`Wrong connected-account destination: ${destinationId}`)
      if (stripePi.application_fee_amount !== economics.platform_fee_cents) {
        throw new Error(`Wrong Stripe application fee: ${stripePi.application_fee_amount}`)
      }
      const chargeId = typeof stripePi.latest_charge === 'string' ? stripePi.latest_charge : stripePi.latest_charge?.id
      const charge = await stripe.charges.retrieve(chargeId, { expand: ['transfer', 'application_fee'] })
      const transfer = typeof charge.transfer === 'string' ? await stripe.transfers.retrieve(charge.transfer) : charge.transfer
      const applicationFee = typeof charge.application_fee === 'string'
        ? await stripe.applicationFees.retrieve(charge.application_fee)
        : charge.application_fee
      const transferDestination = typeof transfer?.destination === 'string' ? transfer.destination : transfer?.destination?.id
      if (transferDestination !== account.id) {
        throw new Error(`Stripe transfer proof mismatch: destination=${transferDestination}, amount=${transfer?.amount}`)
      }
      if (applicationFee?.amount !== economics.platform_fee_cents) {
        throw new Error(`Stripe application-fee proof mismatch: ${applicationFee?.amount}`)
      }
      if ((transfer?.amount || 0) - applicationFee.amount !== economics.creator_payout_cents) {
        throw new Error(`Stripe net connected amount mismatch: transfer=${transfer?.amount}, fee=${applicationFee.amount}`)
      }

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
        payment_intent_id: pi.id,
        purchase_id: purchase.id,
      })
      console.log(`  ✅ ${tc.name} — price ${settled.price_cents}c, platform ${settled.platform_fee_cents}c, creator ${settled.creator_payout_cents}c`)
    } catch (err) {
      console.error(`  ❌ ${tc.name}:`, err.message)
      results.push({ name: tc.name, ok: false, error: err.message })
    }
  }
  return results
}

async function verifyRefund(result) {
  const refundRes = await api('/api/admin/recipe-purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({ purchase_id: result.purchase_id, reason: 'Automated Stripe test refund' }),
  })
  if (refundRes.status !== 200) throw new Error(`refund endpoint failed: ${JSON.stringify(refundRes.body)}`)
  const pi = await stripe.paymentIntents.retrieve(result.payment_intent_id)
  const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id
  const charge = await stripe.charges.retrieve(chargeId)
  const webhookRes = await sendWebhook('charge.refunded', charge)
  if (webhookRes.status !== 200) throw new Error(`refund webhook failed: ${JSON.stringify(webhookRes.body)}`)
  const { data: purchase } = await admin.from('recipe_purchases').select('status, refund_status').eq('id', result.purchase_id).single()
  const { data: entitlement } = await admin.from('recipe_entitlements').select('status').eq('recipe_purchase_id', result.purchase_id).single()
  if (purchase?.status !== 'refunded' || purchase?.refund_status !== 'succeeded' || entitlement?.status !== 'refunded') {
    throw new Error('Refund did not revoke entitlement and settle database state')
  }
  console.log('  ✅ Refund reversed transfer/application fee and revoked entitlement')
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
  if (account) try { await stripe.accounts.del(account.id) } catch {}
  console.log('Cleaned up')
}

async function main() {
  try {
    await setup()
    const results = await runTestCases()
    const successful = results.filter((result) => result.ok)
    if (successful.length) await verifyRefund(successful[0])
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
