import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { fetchOsmFoodPlaces, OSM_SOURCE, type ProviderPlace } from '@/lib/openstreetmap-places'
import { findDuplicate } from '@/lib/place-dedup'

type ImportInput = { areaLabel: string; latitude: number; longitude: number; radiusMeters: number; mode: 'preview' | 'import' }

const comparableFields = [
  'name', 'place_type', 'location_text', 'address', 'city', 'state', 'postal_code',
  'latitude', 'longitude', 'phone', 'website', 'order_url', 'category', 'cuisine',
  'hours', 'operational_status', 'external_source', 'external_source_id',
  'external_place_id', 'source', 'provider_metadata',
]

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stableValue(nested)]))
  }
  return value ?? null
}

function hasProviderChanges(existing: Record<string, unknown>, next: Record<string, unknown>) {
  return comparableFields.some(field => JSON.stringify(stableValue(existing[field])) !== JSON.stringify(stableValue(next[field])))
}

function toDatabasePlace(place: ProviderPlace, areaLabel: string) {
  const locationText = place.address || [place.city, place.state].filter(Boolean).join(', ') || `${areaLabel} area`
  return {
    name: place.name, place_type: place.placeType, location_text: locationText, address: place.address,
    city: place.city, state: place.state, postal_code: place.postalCode,
    latitude: place.latitude, longitude: place.longitude, phone: place.phone,
    website: place.website, order_url: place.orderUrl, category: place.category,
    cuisine: place.cuisine, hours: place.hours, operational_status: place.operationalStatus,
    external_source: place.externalSource, external_source_id: place.externalSourceId,
    external_place_id: `${place.externalSource}:${place.externalSourceId}`,
    source: 'provider_import', claimed_status: 'unclaimed', status: 'active',
    provider_metadata: place.providerMetadata, last_imported_at: new Date().toISOString(),
  }
}

async function loadAllPlaces(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const rows: any[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from('places').select('*').order('id').range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

export async function runPlaceImport(input: ImportInput) {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  const { data: run, error: runError } = await admin.from('place_import_runs').insert({
    external_source: OSM_SOURCE, area_label: input.areaLabel, center_latitude: input.latitude,
    center_longitude: input.longitude, radius_meters: input.radiusMeters, mode: input.mode,
  }).select('id').single()
  if (runError) throw new Error(runError.message)
  try {
    const providerPlaces = await fetchOsmFoodPlaces(input.latitude, input.longitude, input.radiusMeters)
    const existing = await loadAllPlaces(admin)
    let newCount = 0, updatedCount = 0, unchangedCount = 0, duplicateCount = 0, claimedSkippedCount = 0
    const errors: string[] = []
    const preview: Array<ProviderPlace & { action: string; existingId?: string }> = []
    for (const place of providerPlaces) {
      const duplicate = findDuplicate(existing, place)
      const record = toDatabasePlace(place, input.areaLabel)
      if (duplicate && !place.address && !place.city && !place.state) record.location_text = duplicate.location_text
      const claimed = duplicate && (duplicate.claimed_status !== 'unclaimed' || duplicate.claimed_seller_id)
      const sameProviderPlace = duplicate && duplicate.external_source === place.externalSource && duplicate.external_source_id === place.externalSourceId
      const action = claimed ? 'claimed_skip' : duplicate ? (sameProviderPlace ? (hasProviderChanges(duplicate, record) ? 'update' : 'unchanged') : 'duplicate') : 'new'
      preview.push({ ...place, action, ...(duplicate ? { existingId: duplicate.id } : {}) })
      if (input.mode === 'preview') continue
      if (claimed) { claimedSkippedCount++; continue }
      if (action === 'unchanged') { unchangedCount++; continue }
      if (action === 'duplicate') { duplicateCount++; continue }
      if (duplicate) {
        const updates = Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null && value !== ''))
        const { error } = await admin.from('places').update(updates).eq('id', duplicate.id).eq('claimed_status', 'unclaimed')
        if (error) errors.push(`${place.externalSourceId}: ${error.message}`); else updatedCount++
      } else {
        const { data, error } = await admin.from('places').insert(record).select().single()
        if (error) errors.push(`${place.externalSourceId}: ${error.message}`)
        else { newCount++; existing.push(data) }
      }
    }
    const summary = { found: providerPlaces.length, new: newCount, updated: updatedCount, unchanged: unchangedCount, duplicatesSkipped: duplicateCount, claimedSkipped: claimedSkippedCount, errors }
    await admin.from('place_import_runs').update({ status: errors.length ? 'failed' : 'completed', found_count: summary.found, new_count: newCount, updated_count: updatedCount, unchanged_count: unchangedCount, duplicate_count: duplicateCount, claimed_skipped_count: claimedSkippedCount, error_count: errors.length, errors, completed_at: new Date().toISOString() }).eq('id', run.id)
    return { runId: run.id, source: OSM_SOURCE, area: input.areaLabel, mode: input.mode, summary, places: preview }
  } catch (error: any) {
    await admin.from('place_import_runs').update({ status: 'failed', error_count: 1, errors: [error.message], completed_at: new Date().toISOString() }).eq('id', run.id)
    throw error
  }
}
