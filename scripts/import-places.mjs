const args = Object.fromEntries(process.argv.slice(2).map(value => {
  const [key, ...rest] = value.replace(/^--/, '').split('=')
  return [key, rest.join('=') || true]
}))

const baseUrl = String(args.url || process.env.IMPORT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const adminSecret = process.env.ADMIN_SECRET
if (!adminSecret) throw new Error('ADMIN_SECRET is required')
const payload = {
  areaLabel: args.area,
  latitude: Number(args.lat),
  longitude: Number(args.lng),
  radiusMeters: Number(args.radius || 4000),
  mode: args.import ? 'import' : 'preview',
}
if (!payload.areaLabel || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
  throw new Error('Usage: npm run places:import -- --area="Ferguson, MO" --lat=... --lng=... --radius=4000 [--import] [--url=https://...]')
}
const response = await fetch(`${baseUrl}/api/admin/places/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
  body: JSON.stringify(payload),
})
const result = await response.json().catch(() => ({}))
if (!response.ok) throw new Error(result.error || `Import request failed (${response.status})`)
console.log(JSON.stringify({ runId: result.runId, source: result.source, area: result.area, mode: result.mode, summary: result.summary }, null, 2))
if (payload.mode === 'preview') {
  console.table((result.places || []).map(place => ({ action: place.action, name: place.name, address: place.address || '', type: place.placeType, sourceId: place.externalSourceId })))
}
