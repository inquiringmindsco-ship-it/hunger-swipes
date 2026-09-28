// Backfill image fingerprints for existing community food posts.
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function computeFingerprint(bytes) {
  const buf = Buffer.from(bytes)
  const imageHash = crypto.createHash('sha256').update(buf).digest('hex')
  let perceptualHash
  try {
    const sharp = (await import('sharp')).default
    const gray = await sharp(buf, { failOn: 'none' }).resize(8, 8, { fit: 'fill' }).grayscale().raw().toBuffer()
    const avg = gray.reduce((a, b) => a + b, 0) / gray.length
    perceptualHash = Array.from(gray).map((v) => (v >= avg ? '1' : '0')).join('')
  } catch {
    perceptualHash = imageHash.slice(0, 64)
  }
  return { imageHash, perceptualHash }
}

async function run() {
  const { data: posts, error } = await admin.from('community_food_posts').select('id, photo_url, moderation_status').is('image_hash', null)
  if (error) throw error
  if (!posts?.length) {
    console.log('No posts need fingerprint backfill.')
    return
  }

  console.log(`Backfilling ${posts.length} posts...`)
  for (const post of posts) {
    try {
      const res = await fetch(post.photo_url)
      if (!res.ok) {
        console.warn(`Could not fetch ${post.id}: ${res.status}`)
        continue
      }
      const { imageHash, perceptualHash } = await computeFingerprint(await res.arrayBuffer())
      await admin.from('community_food_posts').update({ image_hash: imageHash, perceptual_hash: perceptualHash }).eq('id', post.id)
      await admin.from('image_fingerprints').insert({ community_post_id: post.id, image_hash: imageHash, perceptual_hash: perceptualHash, rejected: post.moderation_status === 'rejected' })
      console.log(`✓ ${post.id}`)
    } catch (err) {
      console.warn(`Failed ${post.id}:`, err.message)
    }
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
