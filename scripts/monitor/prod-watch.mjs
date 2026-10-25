#!/usr/bin/env node
/** IMG-DS Phase 1 production monitor (read-only). Zero new infrastructure. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const baselines = JSON.parse(readFileSync(new URL('./baselines.json', import.meta.url), 'utf8'))
const alertLines = []

async function routeCheck(app, path, expectOk = true) {
  const base = baselines[app]?.baseUrl
  const url = `${base}${path}`
  try {
    const started = Date.now()
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'imgds-prod-watch/1' } })
    const ms = Date.now() - started
    // Accept 200-308 (redirects are normal for auth-gated pages); count 4xx/5xx as failures
    const ok = res.status >= 200 && res.status < 400
    return { app, path, status: res.status, ms, ok }
  } catch (e) {
    return { app, path, status: 0, ms: 0, ok: false, error: String(e?.message || e).slice(0, 60) }
  }
}

async function discoverDeck() {
  const url = `${baselines['hunger-swipes'].baseUrl}/api/dishes?limit=50`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const json = await res.json()
    const cards = json.dishes || []
    const keys = cards.map((c) => `${c.content_kind}:${c.id}`)
    const dupes = keys.length - new Set(keys).size
    return { app: 'hunger-swipes', path: '/api/dishes (deck)', status: res.status, cards: cards.length, dupes, ok: cards.length >= (baselines['hunger-swipes'].minDiscoverCards || 1) && dupes === 0 }
  } catch (e) {
    return { app: 'hunger-swipes', path: '/api/dishes (deck)', status: 0, cards: 0, dupes: 0, ok: false, error: String(e?.message || e).slice(0, 60) }
  }
}

const checks = [
  ...Object.entries(baselines).flatMap(([app, cfg]) => (cfg.routes || []).map((p) => () => routeCheck(app, p))),
  () => discoverDeck(),
]
const results = []
const queue = [...checks]
await Promise.all(Array.from({ length: 5 }, async () => { while (queue.length) results.push(await queue.shift()()) }))

for (const r of results) if (!r.ok) {
  alertLines.push(`FAIL ${r.app}${r.path} status=${r.status}${r.cards != null ? ` cards=${r.cards}` : ''}${r.error ? ` err=${r.error}` : ''}`)
}
const summary = { at: new Date().toISOString(), allOk: alertLines.length === 0, failed: alertLines.length, checks: results }
console.log(JSON.stringify(summary, null, 2))
const rollback = baselines._rollback?.command || 'n/a'
if (!summary.allOk) console.log(`ALERTS:\n${alertLines.join('\n')}\nROLLBACK: ${rollback}`)