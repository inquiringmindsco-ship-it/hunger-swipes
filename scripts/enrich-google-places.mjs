const args = Object.fromEntries(process.argv.slice(2).map(value => { const [key, ...rest] = value.replace(/^--/, '').split('='); return [key, rest.join('=') || true] }))
const baseUrl = String(args.url || process.env.IMPORT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
if (!process.env.ADMIN_SECRET) throw new Error('ADMIN_SECRET is required')
const response = await fetch(`${baseUrl}/api/admin/places/google-enrich`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_SECRET },
  body: JSON.stringify({ mode: args.import ? 'import' : 'preview', limit: Math.min(Math.max(Number(args.limit) || 25, 1), 100), force: Boolean(args.force) }),
})
const result = await response.json().catch(() => ({}))
if (!response.ok) throw new Error(result.error || `Google enrichment failed (${response.status})`)
console.log(JSON.stringify(result, null, 2))
