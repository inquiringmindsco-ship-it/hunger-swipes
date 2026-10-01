import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { boundedLimit, isOwnedManagedPhotoUrl, mapCommunityPost } from '@/lib/food'
import { classifyFoodImage, computeImageFingerprint, hammingDistance, ModerationResult } from '@/lib/moderation'
import { promoteApprovedCommunityPlaceImage } from '@/lib/place-images'

const DUPLICATE_HAMMING_THRESHOLD = 8

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const mine = params.get('mine') === 'true'
  const user = mine ? await getRequestUser(request) : null
  if (mine && !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', posts: [] }, { status: 503 })
  let query = admin.from('community_food_posts').select(`*,place:places!inner(id,name,location_text,status)`).eq('places.status', 'active').order('created_at', { ascending: false }).limit(boundedLimit(params.get('limit')))
  query = mine ? query.eq('user_id', user!.id) : query.eq('status', 'active').eq('moderation_status', 'approved')
  if (params.get('placeId')) query = query.eq('place_id', params.get('placeId')!)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, posts: [] }, { status: 500 })
  return NextResponse.json({ posts: (data || []).map(mapCommunityPost) })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const dishName = typeof body.dish_name === 'string' ? body.dish_name.trim() : ''
  if (!body.place_id || dishName.length < 2 || dishName.length > 160 || !isOwnedManagedPhotoUrl(body.photo_url, user.id)) {
    return NextResponse.json({ error: 'Place, food name, and one of your verified HungerSwipes uploads are required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data: place } = await admin.from('places').select('id').eq('id', body.place_id).eq('status', 'active').maybeSingle()
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })

  const creatorName = String(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Community member').slice(0, 100)
  const numericPrice = Number(body.price)

  // Compute or trust hash from upload step. For security, re-download and hash the stored image.
  let imageHash = typeof body.image_hash === 'string' ? body.image_hash : ''
  let perceptualHash = typeof body.perceptual_hash === 'string' ? body.perceptual_hash : ''
  if (!imageHash || !perceptualHash) {
    try {
      const res = await fetch(body.photo_url)
      if (res.ok) {
        const fp = await computeImageFingerprint(await res.arrayBuffer())
        imageHash = fp.imageHash
        perceptualHash = fp.perceptualHash
      }
    } catch {
      // fallback: leave blank; duplicate detection will be limited
    }
  }

  // Duplicate detection: exact hash match or close perceptual hash.
  let duplicateOf: string | null = null
  let previouslyRejected = false
  if (imageHash) {
    const { data: exact } = await admin
      .from('community_food_posts')
      .select('id, moderation_status, image_hash, perceptual_hash')
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .or(`image_hash.eq.${imageHash},perceptual_hash.eq.${perceptualHash}`)
      .limit(20)

    if (exact && exact.length > 0) {
      for (const candidate of exact) {
        if (candidate.image_hash === imageHash) {
          duplicateOf = candidate.id
          previouslyRejected = candidate.moderation_status === 'rejected'
          break
        }
        if (candidate.perceptual_hash && perceptualHash) {
          const dist = hammingDistance(candidate.perceptual_hash, perceptualHash)
          if (dist <= DUPLICATE_HAMMING_THRESHOLD) {
            duplicateOf = candidate.id
            previouslyRejected = candidate.moderation_status === 'rejected'
            break
          }
        }
      }
    }
  }

  // Classification from upload step; if absent, classify now.
  let moderation: ModerationResult | undefined
  const providedStatus = typeof body.moderation_status === 'string' ? body.moderation_status : ''
  if (!providedStatus || !providedStatus.match(/^(approved|rejected|pending_review)$/)) {
    moderation = await classifyFoodImage(body.photo_url)
  } else {
    moderation = {
      status: providedStatus as any,
      confidence: Number(body.moderation_confidence) || 0,
      safetyPassed: providedStatus === 'approved' || providedStatus === 'pending_review',
      foodRelevancePassed: providedStatus === 'approved',
      reasons: Array.isArray(body.moderation_reasons) ? body.moderation_reasons : ['Provided by upload'],
      service: typeof body.moderation_service === 'string' ? body.moderation_service : 'manual',
    }
  }

  // Duplicates of rejected content or strong duplicate signals go to review.
  let finalStatus = moderation.status
  let finalReasons = moderation.reasons
  if (duplicateOf) {
    if (previouslyRejected) {
      finalStatus = 'rejected'
      finalReasons = ['Duplicate of previously rejected content']
    } else if (finalStatus === 'approved') {
      finalStatus = 'pending_review'
      finalReasons = ['Possible duplicate of existing content; review required']
    } else {
      finalReasons = [...finalReasons, 'Possible duplicate of existing content']
    }
  }

  const insertData: any = {
    place_id: place.id,
    user_id: user.id,
    creator_name: creatorName,
    dish_name: dishName,
    description: typeof body.description === 'string' ? body.description.trim().slice(0, 1000) || null : null,
    photo_url: body.photo_url,
    price: Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : null,
    category: typeof body.category === 'string' ? body.category.trim().slice(0, 80) || null : null,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 10) : [],
    moderation_status: finalStatus,
    moderation_reason: finalReasons.join('; '),
    moderation_confidence: moderation.confidence,
    moderation_service: moderation.service,
    moderation_assessment: moderation.assessment || null,
    image_hash: imageHash || null,
    perceptual_hash: perceptualHash || null,
    duplicate_of: duplicateOf,
  }

  const { data, error } = await admin
    .from('community_food_posts')
    .insert(insertData)
    .select(`*,place:places!inner(id,name,location_text,status)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record fingerprint for future duplicate detection.
  if (imageHash) {
    await admin.from('image_fingerprints').insert({
      community_post_id: data.id,
      image_hash: imageHash,
      perceptual_hash: perceptualHash || null,
      rejected: finalStatus === 'rejected',
    })
  }

  if (finalStatus === 'approved') {
    try {
      await promoteApprovedCommunityPlaceImage(admin, place.id, data.photo_url)
    } catch (error) {
      console.error('community place image promotion failed', error)
    }
  }

  return NextResponse.json({ post: mapCommunityPost(data) }, { status: 201 })
}
