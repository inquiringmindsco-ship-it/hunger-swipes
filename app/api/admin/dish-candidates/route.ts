import { NextRequest, NextResponse } from 'next/server'
import { getAdminPrincipal } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isOwnedManagedPhotoUrl } from '@/lib/food'

// IMG-DS dish-candidate console (dish-launch mission, 2026-10-25)
// Rights doctrine enforced server-side:
// - Publishing (staging) requires rights_status='approved' AND a documented permission note.
// - Approving rights WITHOUT evidence is refused; evidence is appended immutably (new note line).
// - Unpublish nulls the display fields only — the underlying record is preserved.
// All actions append an audit row to catalog_review_audit (existing service-role table).


function bucketOf(row: any) {
  if (row.rights_status === 'rejected') return { bucket: 'C', reason: 'rejected by owner/admin' }
  if (!row.place?.status || row.place.status !== 'active') return { bucket: 'C', reason: 'place not active' }
  if (row.usage_status === 'temporary_staging' && row.rights_status !== 'approved') return { bucket: 'C', reason: 'staged in DB but hidden from Discover — image rights not documented (validation CSV 2026-10-25)' }
  if (row.rights_status === 'approved') return { bucket: 'A', reason: row.usage_status === 'temporary_staging' ? 'live' : 'rights documented — ready to publish' }
  return { bucket: 'B', reason: 'owner decision needed on image rights (reachability in validation CSV 2026-10-25)' }
}

export async function GET(request: NextRequest) {
  if (!(await getAdminPrincipal(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').toLowerCase()
  const filter = searchParams.get('filter') || 'all'

  const { data, error } = await db
    .from('place_image_candidates')
    .select('id,dish_name,image_url,source_url,source_type,rights_status,usage_status,notes,updated_at,place:places(id,name,city,state,status,cuisine,category,temporary_staging_place_image_url)')
    .order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const livePlaces = await db.from('places').select('id,name,city,temporary_staging_place_image_url').eq('status', 'active').not('temporary_staging_place_image_url', 'is', null)
  const community = await db.from('community_food_posts').select('id,status,moderation_status,place_id,created_at').eq('status','active')
  const official = await db.from('dishes').select('id,name,status', { count: 'exact', head: true }).eq('status', 'active')

  const items = (data || []).map((row: any) => {
    const b = bucketOf(row)
    return {
      id: row.id, dish_name: row.dish_name, image_url: row.image_url, source_url: row.source_url,
      source_type: row.source_type, rights_status: row.rights_status, usage_status: row.usage_status || null,
      notes: row.notes || '', updated_at: row.updated_at,
      place: row.place && { id: row.place.id, name: row.place.name, city: row.place.city, state: row.place.state, status: row.place.status, cuisine: row.place.cuisine || row.place.category || null, staged: Boolean(row.place.temporary_staging_place_image_url) },
      bucket: b.bucket, bucket_reason: b.reason,
    }
  })

  const filtered = items.filter((r) => {
    if (filter.startsWith('bucket:')) return r.bucket === filter.split(':')[1]
    if (filter === 'live') return r.usage_status === 'temporary_staging'
    if (filter === 'approved') return r.rights_status === 'approved'
    if (!q) return true
    return `${r.place?.name || ''} ${r.dish_name} ${r.place?.city || ''} ${r.source_type}`.toLowerCase().includes(q)
  })

  const liveDished = (community.data || []).filter((p: any) => p.moderation_status === 'approved').length
  const stagedInDb = (livePlaces.data || []).length
  const stagedApproved = items.filter((i) => i.usage_status === 'temporary_staging' && i.rights_status === 'approved').length
  const counts = {
    total: items.length,
    A: items.filter((i) => i.bucket === 'A').length,
    B: items.filter((i) => i.bucket === 'B').length,
    C: items.filter((i) => i.bucket === 'C').length,
    // livePublished = cards actually served by Discover (community + rights-approved staged). Staged-but-unverified rows are NEVER counted here.
    livePublished: liveDished + stagedApproved,
  }
  return NextResponse.json({ items: filtered, counts, live: { stagedPlaces: livePlaces.data || [], stagedInDb: stagedInDb, stagedShownInDiscover: stagedApproved, communityApproved: liveDished, officialDishes: official.count || 0, discoverLiveCards: liveDished + stagedApproved } })
}

async function audit(db: any, actor: string, action: string, targetStagingIds: string[], reviewReason: string, before: any, after: any) {
  await db.from('catalog_review_audit').insert({ actor, action: 'status_override', target_staging_ids: [], review_reason: `dish-admin:${action}`, before, after: { ...after, candidates: targetStagingIds, actor } })
}

export async function POST(request: NextRequest) {
  const principal = await getAdminPrincipal(request)
  if (!principal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '')
  const ids: string[] = Array.isArray(body.ids) && body.ids.length <= 50 ? body.ids : String(body.id ? [body.id] : [])
  if (!ids.length || !action) return NextResponse.json({ error: 'id/ids and action required' }, { status: 400 })
  const { data: rows, error: loadError } = await db.from('place_image_candidates').select('*').in('id', ids)
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  const actor = principal.kind === 'owner' ? `owner:${principal.userId}` : 'legacy-dish-admin'

  if (action === 'replace_image') {
    if (principal.kind !== 'owner') {
      return NextResponse.json({ error: 'Image replacement requires an authenticated owner account.' }, { status: 403 })
    }
    const imageUrl = String(body.image_url || '').trim()
    const evidence = String(body.permission_evidence || '').trim()
    if (!isOwnedManagedPhotoUrl(imageUrl, principal.userId)) {
      return NextResponse.json({ error: 'Replacement must be an image uploaded by the signed-in owner.' }, { status: 400 })
    }
    if (evidence.length < 8) {
      return NextResponse.json({ error: 'Document who owns or authorized this replacement image.' }, { status: 400 })
    }
    const outs: any[] = []
    for (const row of rows || []) {
      const previous = row.notes || ''
      const stamp = `\n[OWNER IMAGE ${new Date().toISOString()} by ${actor}] ${evidence}`
      const { error } = await db.from('place_image_candidates').update({
        image_url: imageUrl,
        source_url: imageUrl,
        source_type: 'owner_upload',
        rights_status: 'approved',
        notes: `${previous}${stamp}`,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id)
      let placeError = null
      if (!error && row.usage_status === 'temporary_staging') {
        const result = await db.from('places').update({ temporary_staging_place_image_url: imageUrl }).eq('id', row.place_id)
        placeError = result.error
      }
      outs.push({ id: row.id, ok: !error && !placeError, liveImageUpdated: row.usage_status === 'temporary_staging' && !placeError })
    }
    await audit(db, actor, 'replace_image', ids, evidence.slice(0, 200), rows, { image_url: imageUrl, rights_status: 'approved', source_type: 'owner_upload' })
    return NextResponse.json({ results: outs })
  }

  if (action === 'approve_rights') {
    // Publishing authorization requires DOCUMENTED permission evidence from the owner.
    const evidence = String(body.permission_evidence || '').trim()
    if (evidence.length < 8) {
      return NextResponse.json({ error: 'permission_evidence required (who granted permission, when, and how it is documented). Rights approval without documented authorization is forbidden.' }, { status: 400 })
    }
    const outs: any[] = []
    for (const row of rows || []) {
      const previous: string = row.notes || ''
      const stamp = `\n[PERMISSION EVIDENCE ${new Date().toISOString()} by ${actor}] ${evidence}`
      const { data, error } = await db.from('place_image_candidates')
        .update({ rights_status: 'approved', notes: `${previous}${stamp}`, updated_at: new Date().toISOString() })
        .eq('id', row.id).select('id,rights_status').single()
      if (error) outs.push({ id: row.id, error: error.message })
      else outs.push(data)
    }
    await audit(db, actor, 'approve_rights', ids, evidence.slice(0, 200), rows, { rights_status: 'approved' })
    return NextResponse.json({ results: outs })
  }

  if (action === 'reject') {
    const reason = String(body.reason || 'owner rejected')
    const outs = []
    for (const row of rows || []) {
      const { error } = await db.from('place_image_candidates')
        .update({ rights_status: 'rejected', usage_status: null, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      outs.push({ id: row.id, ok: !error })
    }
    await audit(db, actor, 'reject', ids, reason, rows, { rights_status: 'rejected' })
    return NextResponse.json({ results: outs })
  }

  if (action === 'publish' || action === 'restore') {
    // Stage the dish as a starter card — ONLY with documented (approved) rights.
    const outs: any[] = []
    for (const row of rows || []) {
      if (row.rights_status !== 'approved') { outs.push({ id: row.id, error: 'REFUSED: publishing requires documented rights (rights_status=approved). Evidence via approve_rights first.' }); continue }
      if (row.rights_status === 'approved') {
        const { error: placeError } = await db.from('places').update({ temporary_staging_place_image_url: row.image_url }).eq('id', row.place_id)
        const { error } = await db.from('place_image_candidates').update({ usage_status: 'temporary_staging', updated_at: new Date().toISOString() }).eq('id', row.id)
        outs.push({ id: row.id, ok: !error && !placeError, place_staged: !placeError })
      }
    }
    await audit(db, actor, 'promote', ids, `dish-admin:${action}`, rows, { usage_status: 'temporary_staging' })
    return NextResponse.json({ results: outs })
  }

  if (action === 'unpublish') {
    // EMERGENCY CONTROL: immediate removal from Discover; underlying record preserved.
    const outs: any[] = []
    for (const row of rows || []) {
      const { error: placeError } = await db.from('places').update({ temporary_staging_place_image_url: null }).eq('id', row.place_id)
      const { error } = await db.from('place_image_candidates').update({ usage_status: null, updated_at: new Date().toISOString() }).eq('id', row.id)
      outs.push({ id: row.id, unpublishable: !error && !placeError, recordPreserved: true })
    }
    await audit(db, actor, 'status_override', ids, 'dish-admin:unpublish', rows, { usage_status: null, display_cleared: true })
    return NextResponse.json({ results: outs, note: 'Display fields cleared immediately; record + history preserved.' })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
