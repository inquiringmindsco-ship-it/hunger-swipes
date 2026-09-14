import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.AUDIT_BASE_URL || 'http://localhost:3002'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminSecret = process.env.ADMIN_SECRET

if (!supabaseUrl || !anonKey || !serviceKey || !adminSecret) {
  throw new Error('Supabase and admin environment variables are required')
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const password = `Audit-${runId}-Aa1!`
const created = { users: [], sellers: [], dishes: [], storage: [] }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, { token, method = 'GET', body, adminAuth = false } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (adminAuth) headers['x-admin-secret'] = adminSecret
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

async function createUser(label) {
  const email = `seller-auth-audit-${label}-${runId}@example.com`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw error || new Error(`Unable to create user ${label}`)
  created.users.push(data.user.id)

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: login, error: loginError } = await client.auth.signInWithPassword({ email, password })
  if (loginError || !login.session) throw loginError || new Error(`Unable to sign in user ${label}`)
  return { id: data.user.id, token: login.session.access_token, client }
}

async function cleanup() {
  if (created.sellers.length > 0) {
    await admin.from('admin_actions').delete().in('target_id', created.sellers)
  }
  for (const id of created.dishes) await admin.from('dishes').delete().eq('id', id)
  if (created.sellers.length) await admin.from('places').delete().in('legacy_seller_id', created.sellers)
  for (const id of created.sellers) await admin.from('sellers').delete().eq('id', id)
  if (created.storage.length) await admin.storage.from('dish-photos').remove(created.storage)
  for (const id of created.users) await admin.auth.admin.deleteUser(id)
}

try {
  const userA = await createUser('a')
  const userB = await createUser('b')

  const sellerAResponse = await request('/api/sellers', {
    token: userA.token,
    method: 'POST',
    body: { business_name: `Audit Seller A ${runId}`, seller_type: 'restaurant', location_text: 'Audit City' },
  })
  assert(sellerAResponse.status === 201, `A seller create returned ${sellerAResponse.status}`)
  const sellerA = sellerAResponse.payload.seller
  created.sellers.push(sellerA.id)
  assert(sellerA.owner_user_id === userA.id, 'A seller was not bound to User A')
  assert(sellerA.status === 'pending_review', 'A seller bypassed pending review')

  const photoPath = `${userA.id}/dish-photos/security-${runId}.png`
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'))
  const { error: uploadError } = await admin.storage.from('dish-photos').upload(photoPath, png, { contentType: 'image/png' })
  if (uploadError) throw uploadError
  created.storage.push(photoPath)
  const photoUrl = admin.storage.from('dish-photos').getPublicUrl(photoPath).data.publicUrl

  const dishAResponse = await request('/api/dishes', {
    token: userA.token,
    method: 'POST',
    body: {
      seller_id: sellerA.id,
      name: `Audit Dish A ${runId}`,
      price: 12.34,
      photo_url: photoUrl,
      availability: 'available',
      status: 'active',
    },
  })
  assert(dishAResponse.status === 201, `A dish create returned ${dishAResponse.status}`)
  const dishA = dishAResponse.payload.dish
  created.dishes.push(dishA.id)
  const editA = await request(`/api/dishes?id=${dishA.id}`, {
    token: userA.token,
    method: 'PUT',
    body: { price: 13.45 },
  })
  assert(editA.status === 200 && Number(editA.payload.dish.price) === 13.45, 'A could not edit Dish A')
  console.log('TEST A — PASS: User A created Seller A, created Dish A, and edited Dish A')

  const sellerBResponse = await request('/api/sellers', {
    token: userB.token,
    method: 'POST',
    body: { business_name: `Audit Seller B ${runId}`, seller_type: 'restaurant', location_text: 'Audit City' },
  })
  assert(sellerBResponse.status === 201, `B seller create returned ${sellerBResponse.status}`)
  created.sellers.push(sellerBResponse.payload.seller.id)

  const crossSeller = await request(`/api/sellers?id=${sellerA.id}`, {
    token: userB.token,
    method: 'PUT',
    body: { business_name: 'Cross-seller attack' },
  })
  assert(crossSeller.status === 404, `Cross-seller update returned ${crossSeller.status}`)
  console.log('TEST B — PASS: User B could not edit Seller A')

  const crossDish = await request(`/api/dishes?id=${dishA.id}`, {
    token: userB.token,
    method: 'PUT',
    body: { price: 0.01 },
  })
  assert(crossDish.status === 404, `Dish-ID attack returned ${crossDish.status}`)
  console.log('TEST C — PASS: User B could not edit Dish A by ID')

  const bypass = await request(`/api/sellers?id=${sellerA.id}`, {
    token: userA.token,
    method: 'PUT',
    body: { status: 'active', verification_status: 'approved' },
  })
  assert(bypass.status === 403, `Status bypass returned ${bypass.status}`)
  const { data: unchangedSeller } = await admin.from('sellers').select('status,verification_status').eq('id', sellerA.id).single()
  assert(unchangedSeller.status === 'pending_review' && unchangedSeller.verification_status === 'pending', 'Status bypass changed moderation fields')
  console.log('TEST D — PASS: Seller could not self-approve')

  const approve = await request('/api/admin/suspend', {
    adminAuth: true,
    method: 'POST',
    body: { targetType: 'seller', targetId: sellerA.id, action: 'approve', reason: 'Security audit' },
  })
  const suspend = await request('/api/admin/suspend', {
    adminAuth: true,
    method: 'POST',
    body: { targetType: 'seller', targetId: sellerA.id, action: 'suspend', reason: 'Security audit' },
  })
  const restore = await request('/api/admin/suspend', {
    adminAuth: true,
    method: 'POST',
    body: { targetType: 'seller', targetId: sellerA.id, action: 'approve', reason: 'Security audit' },
  })
  assert(approve.status === 200 && suspend.status === 200 && restore.status === 200, 'Admin moderation action failed')
  console.log('TEST E — PASS: Admin approved, suspended, and restored Seller A')

  const feed = await request('/api/dishes')
  assert(feed.status === 200 && feed.payload.dishes.some((dish) => dish.id === dishA.id), 'Public feed did not return active Dish A')
  assert(!('owner_user_id' in feed.payload.dishes.find((dish) => dish.id === dishA.id).seller), 'Public feed exposed seller ownership')
  const swipe = await request('/api/swipe', {
    token: userB.token,
    method: 'POST',
    body: { eaterId: userA.id, contentId: dishA.id, contentKind: 'official', direction: 'right' },
  })
  const saves = await request('/api/saves', { token: userB.token })
  const anonymousSwipe = await request('/api/swipe', { method: 'POST', body: { contentId: dishA.id, contentKind: 'official', direction: 'right' } })
  const { data: recordedSwipe } = await admin.from('food_swipes').select('actor_id').eq('content_id', dishA.id).single()
  assert(swipe.status === 200 && saves.status === 200 && saves.payload.saved.some((saved) => saved.dish.id === dishA.id), 'Authenticated swipe/save regression')
  assert(anonymousSwipe.status === 401 && recordedSwipe.actor_id === userB.id, 'Client-controlled identity was accepted')
  console.log('TEST F — PASS: Swipe/save uses the authenticated account and rejects anonymous identity spoofing')

  await userA.client.auth.signOut()
  const { data: signedOut } = await userA.client.auth.getSession()
  assert(!signedOut.session, 'User A session remained after sign-out')
  const signedOutSellerWrite = await request(`/api/sellers?id=${sellerA.id}`, { method: 'PUT', body: { business_name: 'Signed-out attack' } })
  const signedOutDishWrite = await request(`/api/dishes?id=${dishA.id}`, { method: 'PUT', body: { price: 0.02 } })
  assert(signedOutSellerWrite.status === 401 && signedOutDishWrite.status === 401, 'Signed-out writes were authorized')
  console.log('TEST G — PASS: Sign-out cleared the session and unauthenticated writes returned 401')

  const { data: directSellerUpdate, error: directSellerError } = await userB.client
    .from('sellers').update({ business_name: 'Direct RLS attack' }).eq('id', sellerA.id).select('id')
  assert(directSellerError || directSellerUpdate.length === 0, 'RLS allowed direct cross-seller update')
  const { data: directDishUpdate, error: directDishError } = await userB.client
    .from('dishes').update({ price: 0.03 }).eq('id', dishA.id).select('id')
  assert(directDishError || directDishUpdate.length === 0, 'RLS allowed direct cross-dish update')
  const { error: directSwipeError } = await userB.client
    .from('food_swipes').insert({ actor_id: userB.id, content_kind: 'official', content_id: dishA.id, direction: 'left' })
  assert(directSwipeError, 'RLS allowed direct food_swipes mutation')
  console.log('RLS — PASS: direct seller, dish, and swipe mutations were blocked')
} finally {
  await cleanup()
}
