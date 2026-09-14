import { stLouisMetroZones } from './st-louis-metro-zones.mjs'

const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const [key, ...rest] = value.replace(/^--/, '').split('=')
  return [key, rest.join('=') || true]
}))

const baseUrl = String(args.url || process.env.IMPORT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const adminSecret = process.env.ADMIN_SECRET
if (!adminSecret) throw new Error('ADMIN_SECRET is required')
const mode = args.import ? 'import' : 'preview'
const startZone = Math.min(Math.max(Number(args['start-zone']) || 1, 1), stLouisMetroZones.length)
const zoneLimit = Math.min(Math.max(Number(args['limit-zones']) || stLouisMetroZones.length, 1), stLouisMetroZones.length)
const zones = args.metro === 'stlouis'
  ? stLouisMetroZones.slice(startZone - 1, startZone - 1 + zoneLimit)
  : [{ area: args.area, lat: Number(args.lat), lng: Number(args.lng), radius: Number(args.radius || 4000) }]
if (!zones[0]?.area || !Number.isFinite(zones[0]?.lat) || !Number.isFinite(zones[0]?.lng)) throw new Error('Usage: --metro=stlouis or --area="Ferguson, MO" --lat=... --lng=... --radius=4000 [--import] [--url=https://...]')

const totals = { zones: zones.length, completed: 0, failed: 0, found: 0, new: 0, updated: 0, unchanged: 0, duplicatesSkipped: 0, claimedSkipped: 0, errors: [] }
for (const zone of zones) {
  try {
    const response = await fetch(`${baseUrl}/api/admin/places/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
      body: JSON.stringify({ areaLabel: zone.area, latitude: zone.lat, longitude: zone.lng, radiusMeters: zone.radius, mode }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `Import request failed (${response.status})`)
    totals.completed++
    for (const key of ['found', 'new', 'updated', 'unchanged', 'duplicatesSkipped', 'claimedSkipped']) totals[key] += result.summary[key] || 0
    console.log(JSON.stringify({ area: zone.area, summary: result.summary }))
    if (mode === 'preview' && zones.length === 1) console.table((result.places || []).map(place => ({ action: place.action, name: place.name, address: place.address || '', type: place.placeType, sourceId: place.externalSourceId })))
  } catch (error) {
    totals.failed++; totals.errors.push(`${zone.area}: ${error.message}`)
    console.error(`${zone.area}: ${error.message}`)
  }
}
console.log(JSON.stringify({ mode, metro: args.metro || null, totals }, null, 2))
if (totals.failed) process.exitCode = 1
