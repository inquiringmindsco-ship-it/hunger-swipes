import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkAdmin } from '@/lib/admin-auth'

/**
 * Admin Food Content Intake
 *
 * POST /api/admin/food-intake
 * Accepts either an uploaded dish image (creates a dish) or an external image URL
 * (creates a place_image_candidates row for review).
 */
export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const placeId = body.place_id
  const dishName = typeof body.dish_name === 'string' ? body.dish_name.trim() : ''
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
  const intakeKind = body.intake_kind === 'uploaded_dish' ? 'uploaded_dish' : 'candidate_url'

  if (!placeId || !dishName || !imageUrl) {
    return NextResponse.json(
      { error: 'place_id, dish_name, and image_url are required' },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()

  try {
    // 1. Verify place exists.
    const { data: place, error: placeError } = await admin
      .from('places')
      .select('id,name')
      .eq('id', placeId)
      .maybeSingle()
    if (placeError || !place) {
      return NextResponse.json(
        { error: placeError?.message || 'Place not found' },
        { status: placeError ? 500 : 404 },
      )
    }

    // 2. Build shared candidate / log payload.
    const tags = Array.isArray(body.tags) ? body.tags : []
    const price = typeof body.price === 'number' ? body.price : null
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null
    const sourceUrl = typeof body.source_url === 'string' ? body.source_url.trim() : null
    const sourceType = typeof body.source_type === 'string' ? body.source_type.trim() : null
    const rightsStatus =
      body.rights_status === 'owner_approved' ? 'owner_approved' : 'permission_required'

    const intakeLog = {
      place_id: placeId,
      dish_name: dishName,
      intake_kind: intakeKind,
      image_url: imageUrl,
      rights_status: rightsStatus,
      source_url: sourceUrl,
      source_type: sourceType,
      notes,
      created_by: null,
      created_at: now,
    }

    // 3a. Uploaded dish image path: create an active/pending dish tied to the place.
    if (intakeKind === 'uploaded_dish') {
      // Try to attach to a seller when one is already claimed for this place.
      const { data: claimed } = await admin
        .from('places')
        .select('claimed_seller_id')
        .eq('id', placeId)
        .maybeSingle()

      const { data: dish, error: dishError } = await admin
        .from('dishes')
        .insert({
          name: dishName,
          description: typeof body.description === 'string' ? body.description.trim() || null : null,
          photo_url: imageUrl,
          price,
          category: typeof body.category === 'string' ? body.category.trim() || null : null,
          tags,
          status: 'pending',
          availability: 'available',
          seller_id: claimed?.claimed_seller_id || null,
          place_id: placeId,
          source_type: sourceType || 'admin_upload',
        })
        .select()
        .single()
      if (dishError) {
        return NextResponse.json({ error: dishError.message }, { status: 500 })
      }

      const { error: logError } = await admin.from('food_intake_log').insert(intakeLog)
      if (logError) console.error('food_intake_log insert failed', logError)

      return NextResponse.json(
        { success: true, dish, place_id: placeId, intake_kind: intakeKind },
        { status: 201 },
      )
    }

    // 3b. External URL path: create a candidate for rights review.
    const { data: candidate, error: candidateError } = await admin
      .from('place_image_candidates')
      .insert({
        place_id: placeId,
        dish_name: dishName,
        image_url: imageUrl,
        source_url: sourceUrl,
        source_type: sourceType,
        rights_status: rightsStatus,
        notes,
      })
      .select()
      .single()
    if (candidateError) {
      return NextResponse.json({ error: candidateError.message }, { status: 500 })
    }

    const { error: logError } = await admin.from('food_intake_log').insert(intakeLog)
    if (logError) console.error('food_intake_log insert failed', logError)

    return NextResponse.json(
      { success: true, candidate, place_id: placeId, intake_kind: intakeKind },
      { status: 201 },
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
