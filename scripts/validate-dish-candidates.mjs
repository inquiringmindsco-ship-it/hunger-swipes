#!/usr/bin/env node
/** Internal validation of dish candidates: place status, image reachability (HEAD only), name quality. Read-only; writes CSV report. */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const GENERIC = /^(food|menu item|dish|meal|entr(e|é)e|special|combo|plate)$/i

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('place_image_candidates')
    .select('id,dish_name,image_url,source_url,source_type,rights_status,usage_status,notes,place:places!inner(id,name,city,state,status)')
    .order('created_at', { ascending: false }).range(from, from + 999)
  if (error) throw error
  rows.push(...(data || []))
  if (!data || data.length < 1000) break
}

const results = [], summary = { total: 0, placeActive: 0, imageReachable: 0, imageBroken: 0, nameGeneric: 0, usable: 0 }
const CONC = 6, queue = [...rows]
async function worker() {
  while (queue.length) {
    const row = queue.shift()
    const rec = { id: row.id, dish_name: row.dish_name, place: row.place?.name, city: row.place?.city || '', place_status: row.place?.status, rights: row.rights_status, usage: row.usage_status || '', source_type: row.source_type, image_url_ok: '', image_url: row.image_url, source_url: row.source_url }
    summary.total++
    const placeOk = row.place?.status === 'active'
    if (placeOk) summary.placeActive++
    if (GENERIC.test(String(row.dish_name || '').trim())) summary.nameGeneric++
    if (row.usage_status === 'temporary_staging') rec.image_url_ok = 'skip-staged'
    else {
      try {
        const res = await fetch(row.image_url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
        const type = String(res.headers.get('content-type') || '')
        const ok = res.ok && type.startsWith('image/')
        rec.image_url_ok = ok ? 'ok' : `http:${res.status}:${String(type).slice(0, 24)}`
        if (ok) { summary.imageReachable++; if (placeOk && !summary.nameGeneric === false) {} } else summary.imageBroken++
      } catch (e) { rec.image_url_ok = 'error:' + String(e?.message || e).slice(0, 40); summary.imageBroken++ }
      rec.image_url_ok === 'ok' && placeOk && null
    }
    rec.usable = placeOk && rec.image_url_ok === 'ok' && !GENERIC.test(String(row.dish_name || '').trim()) ? 'yes' : 'no'
    if (rec.usable === 'yes') summary.usable++
    results.push(rec)
  }
}
await Promise.all(Array.from({ length: CONC }, worker))
mkdirSync(new URL('../reports/place-image-research/', import.meta.url).pathname, { recursive: true })
const outPath = new URL('../reports/place-image-research/2026-10-25-179-validation.csv', import.meta.url).pathname
const header = 'id,dish_name,place,city,place_status,rights,usage,source_type,image_url_ok,usable,image_url,source_url'
const csv = [header, ...results.map(r => [r.id, r.dish_name, r.place, r.city, r.place_status, r.rights, r.usage, r.source_type, r.image_url_ok, r.usable].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
writeFileSync(outPath, csv)
console.log(JSON.stringify({ ...summary, note: 'usable = active place + reachable image + specific dish name; rights remain permission_required until documented', csv: 'reports/place-image-research/2026-10-25-179-validation.csv' }, null, 2))