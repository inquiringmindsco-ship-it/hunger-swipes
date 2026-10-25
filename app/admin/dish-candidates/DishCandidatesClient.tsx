'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Candidate = {
  id: string
  dish_name: string
  image_url: string
  source_url: string
  source_type: string
  rights_status: string
  usage_status: string | null
  notes: string
  image_ok: boolean
  bucket: 'A' | 'B' | 'C'
  bucket_reason: string
  place?: { id: string; name: string; city?: string; state?: string; status: string; cuisine?: string | null; staged: boolean }
}

type Live = {
  stagedPlaces: Array<{ id: string; name: string; city?: string }>
  stagedInDb?: number
  stagedShownInDiscover?: number
  communityApproved: number
  officialDishes: number
}

const adminFetch = (path: string, init?: RequestInit) =>
  fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET_HEADER || localStorage.getItem('adminSecret') || '' },
    cache: 'no-store',
  })

export default function DishCandidatesClient() {
  const [items, setItems] = useState<Candidate[]>([])
  const [live, setLive] = useState<Live | null>(null)
  const [counts, setCounts] = useState<{ total: number; A: number; B: number; C: number; livePublished: number } | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setError('')
    const res = await adminFetch(`/api/admin/dish-candidates?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(q)}&s=${encodeURIComponent(secret)}`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) { setError(body.error || `HTTP ${res.status}`); setAuthed(false); return }
    setAuthed(true)
    setItems(body.items || [])
    setLive(body.live || null)
    setCounts(body.counts || null)
  }, [filter, q, secret])

  useEffect(() => { if (secret) load() }, [secret, filter?.length, q.length])

  const act = async (action: string, ids: string[], extra: Record<string, unknown> = {}) => {
    setBusy(true); setError('')
    const res = await adminFetch('/api/admin/dish-candidates', { method: 'POST', headers: { 'x-admin-secret': secret }, body: JSON.stringify({ action, ids, ...extra }) })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(body.error || 'Action failed'); return }
    setSelected(new Set())
    await load()
  }

  const bucketColor = (b: string) => (b === 'A' ? '#2ecc71' : b === 'B' ? '#e5b53a' : '#ff6b6b')
  const groups = useMemo(() => ({
    A: items.filter((i) => i.bucket === 'A'),
    B: items.filter((i) => i.bucket === 'B'),
    C: items.filter((i) => i.bucket === 'C'),
  }), [items])

  if (!authed && !secret) {
    return (
      <main style={{ minHeight: '100vh', background: '#0b0b0b', color: '#eaeaea', display: 'grid', placeItems: 'center' }}>
        <div style={{ background: '#151515', padding: 24, borderRadius: 16, width: 320, textAlign: 'center' }}>
          <h1 style={{ fontSize: 16 }}>Dish Candidates Console</h1>
          <input type="password" placeholder="admin secret" onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSecret((e.target as HTMLInputElement).value)} style={{ width: '100%', padding: 10, marginTop: 12, borderRadius: 8, background: '#0d0d0d', color: '#eee', border: '1px solid #333' }} />
          <p style={{ color: '#888', fontSize: 11, marginTop: 10 }}>
            Tip: after first sign-in the secret persists in localStorage for this device only.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0b0b0b', color: '#eaeaea', padding: '20px 14px 60px' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Dish Candidates <span style={{ color: '#d4af37' }}>{counts ? `${counts.total}` : ''}</span></h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search restaurant / dish / city" style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 10, background: '#111', border: '1px solid #2c2c2c', color: '#eee' }} />
        {(['all', 'bucket:A', 'bucket:B', 'bucket:C', 'live', 'approved'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 12px', borderRadius: 999, border: filter === f ? '1px solid #d4af37' : '1px solid #333', background: filter === f ? '#d4af3722' : 'transparent', color: filter === f ? '#d4af37' : '#999', fontSize: 12 }}>
            {f.replace('bucket:', '').toUpperCase()}{counts && f.startsWith('bucket:') ? ` ${counts[f.split(':')[1] as 'A']}` : ''}
          </button>
        ))}
        <button onClick={load} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #333', background: '#151515', color: '#bbb' }}>↻ Refresh</button>
      </header>

      {live && (
        <section style={{ display: 'flex', gap: 10, margin: '14px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ background: '#101c14', border: '1px solid #1d5c38', padding: '8px 14px', borderRadius: 10, fontSize: 12 }}>
            LIVE IN DISCOVER: <b style={{ color: '#2ecc71' }}>{live.communityApproved}</b> community cards + <b>{live.stagedShownInDiscover ?? 0}</b> staged · (staged in DB: <b>{live.stagedInDb ?? live.stagedPlaces.length}</b> — remainder gated: rights not documented) · official: <b>{live.officialDishes}</b>
          </div>
          {selected.size > 0 && (
            <>
              <button disabled={busy} onClick={() => act('publish', [...selected])} style={{ background: '#1d5c38', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>Publish ({selected.size}) → starter cards</button>
              <button disabled={busy} onClick={() => act('unpublish', [...selected])} style={{ background: '#5c1d1d', color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>🚨 Emergency unpublish ({selected.size})</button>
              <button disabled={busy} onClick={() => { const ev = window.prompt('Documented permission evidence (who granted, when, where recorded):'); if (ev && ev.length >= 8) act('approve_rights', [...selected], { permission_evidence: ev }) }} style={{ background: '#2a2306', color: '#e5b53a', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>Approve rights ({selected.size})</button>
              <button disabled={busy} onClick={() => { const r = window.prompt('Rejection reason:'); if (r) act('reject', [...selected], { reason: r }) }} style={{ background: '#333', color: '#ffb4b4', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>Reject</button>
            </>
          )}
        </section>
      )}

      {error && <div style={{ background: '#2d1212', border: '1px solid #6b2222', color: '#ffb4b4', padding: 10, borderRadius: 10, margin: '10px 0', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 10 }}>
        {(['A', 'B', 'C'] as const).map((bucketKey) => groups[bucketKey].length > 0 && (
          <div key={bucketKey}>
            <h2 style={{ fontSize: 13, color: bucketColor(bucketKey)?.split(',')[1] || '#ccc', margin: '14px 0 4px' }}>
              Bucket {bucketKey} — {groups[bucketKey].length} candidates
            </h2>
            {groups[bucketKey].map((row) => (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 12, background: '#131313', border: '1px solid #232323', borderRadius: 12, padding: 10, marginBottom: 8, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={selected.has(row.id)} disabled={busy} onChange={(e) => { const n = new Set(selected); e.target.checked ? n.add(row.id) : n.delete(row.id); setSelected(n) }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.image_url} alt={row.dish_name} style={{ width: 76, height: 56, objectFit: 'cover', borderRadius: 8, background: '#222' }} />
                </label>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{row.dish_name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    {row.place?.name}{row.place?.city ? ` · ${row.place.city}` : ''} · {row.source_type} · rights: <b style={{ color: row.rights_status === 'approved' ? '#2ecc71' : row.rights_status === 'rejected' ? '#ff6b6b' : '#e5b53a' }}>{row.rights_status}</b>
                    {row.usage_status === 'temporary_staging' ? <span style={{ color: '#2ecc71' }}> · LIVE</span> : null}
                  </div>
                  {row.bucket_reason && <div style={{ fontSize: 11, color: '#6b7280' }}>{row.bucket === 'B' ? '→ owner decision' : row.bucket_reason}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={row.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#8ab4f8' }}>source ↗</a>
                  {row.usage_status === 'temporary_staging'
                    ? <button disabled={busy} onClick={() => act('unpublish', [row.id])} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: '#5c1d1d', color: '#fff' }}>Unpublish</button>
                    : row.rights_status === 'approved'
                      ? <button disabled={busy} onClick={() => act('publish', [row.id])} style={{ fontSize: 11, padding: '6px 8px', borderRadius: 6, background: '#1d5c38', color: '#fff' }}>Publish</button>
                      : null}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {!items.length && <p style={{ color: '#777', marginTop: 30 }}>No candidates match this view.</p>}
      <p style={{ color: '#555', fontSize: 11, marginTop: 22 }}>Rights doctrine: candidates publish only with documented permission (evidence stored immutably in the candidate notes + audit log). Emergency unpublish removes from Discover instantly while preserving the record.</p>
    </main>
  )
}