'use client'

import Link from 'next/link'
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePreviewModal } from '@/app/components/admin/ImagePreviewModal'
import { adminFetch } from '@/lib/admin-fetch'

type Candidate = {
  id: string
  dish_name: string
  image_url: string
  source_url: string
  source_type: string
  rights_status: string
  usage_status: string | null
  notes: string
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

export default function DishCandidatesClient() {
  const [items, setItems] = useState<Candidate[]>([])
  const [live, setLive] = useState<Live | null>(null)
  const [counts, setCounts] = useState<{ total: number; A: number; B: number; C: number; livePublished: number } | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [access, setAccess] = useState<'checking' | 'owner' | 'denied'>('checking')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<Candidate | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<Candidate | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setError('')
    const session = await adminFetch('/api/admin/session')
    if (!session.ok) {
      setAccess('denied')
      return
    }
    const res = await adminFetch(`/api/admin/dish-candidates?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(q)}`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || `HTTP ${res.status}`)
      setAccess('denied')
      return
    }
    setAccess('owner')
    setItems(body.items || [])
    setLive(body.live || null)
    setCounts(body.counts || null)
  }, [filter, q])

  useEffect(() => { void load() }, [load])

  const act = async (action: string, ids: string[], extra: Record<string, unknown> = {}) => {
    setBusy(true)
    setError('')
    const res = await adminFetch('/api/admin/dish-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids, ...extra }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(body.error || 'Action failed'); return }
    setSelected(new Set())
    await load()
  }

  const replaceImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const target = replaceTarget
    event.target.value = ''
    if (!file || !target) return
    const evidence = window.prompt('Who owns or authorized this photo? Include who, when, and how permission was given.')?.trim()
    if (!evidence) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'dish-photos')
      const upload = await adminFetch('/api/upload', { method: 'POST', body: form })
      const uploaded = await upload.json().catch(() => ({}))
      if (!upload.ok || !uploaded.url) throw new Error(uploaded.error || 'Image upload failed')
      await act('replace_image', [target.id], { image_url: uploaded.url, permission_evidence: evidence })
    } catch (reason) {
      setBusy(false)
      setError(reason instanceof Error ? reason.message : 'Image replacement failed')
    } finally {
      setReplaceTarget(null)
    }
  }

  const groups = useMemo(() => ({
    A: items.filter((item) => item.bucket === 'A'),
    B: items.filter((item) => item.bucket === 'B'),
    C: items.filter((item) => item.bucket === 'C'),
  }), [items])

  if (access === 'checking') {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b0b] px-5 text-white"><p>Checking owner access…</p></main>
  }

  if (access === 'denied') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0b0b] px-5 text-white">
        <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151515] p-6 text-center">
          <h1 className="text-xl font-black">Owner access required</h1>
          <p className="mt-2 text-sm text-white/60">Sign in with the authorized Hunger Swipes owner account. Ordinary accounts cannot open Dish Manager.</p>
          <Link href="/auth?next=/admin/dish-candidates" className="mt-5 block min-h-12 rounded-2xl bg-[#D4AF37] px-4 py-3 font-black text-black">Sign in as owner</Link>
          <Link href="/swipe" className="mt-3 block min-h-11 px-4 py-3 text-sm font-semibold text-white/70">Back to Discover</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-3 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-5">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={replaceImage} />
      <header className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Owner controls</p>
            <h1 className="text-2xl font-black">Dish Manager</h1>
          </div>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-sm font-bold">Admin</Link>
        </div>

        {live && <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">Live in Discover: <b className="text-emerald-400">{live.communityApproved + (live.stagedShownInDiscover || 0)}</b> dishes</div>}
        {error && <div role="alert" className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search dish, restaurant, or city" className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-base" />
          <button type="button" onClick={load} className="min-h-12 rounded-2xl border border-white/10 bg-[#151515] px-5 font-bold">Refresh</button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {(['all', 'bucket:A', 'bucket:B', 'bucket:C', 'live', 'approved'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${filter === value ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-white/10 bg-[#151515] text-white/70'}`}>
              {value.replace('bucket:', '').toUpperCase()}{counts && value.startsWith('bucket:') ? ` ${counts[value.split(':')[1] as 'A' | 'B' | 'C']}` : ''}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="sticky top-2 z-20 mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-[#D4AF37]/30 bg-[#17140a]/95 p-3 backdrop-blur sm:grid-cols-4">
            <button disabled={busy} onClick={() => act('publish', [...selected])} className="min-h-12 rounded-xl bg-emerald-600 px-3 text-sm font-black">Publish ({selected.size})</button>
            <button disabled={busy} onClick={() => act('unpublish', [...selected])} className="min-h-12 rounded-xl bg-red-700 px-3 text-sm font-black">Unpublish</button>
            <button disabled={busy} onClick={() => { const evidence = window.prompt('Document who granted image permission, when, and where it is recorded:'); if (evidence) void act('approve_rights', [...selected], { permission_evidence: evidence }) }} className="min-h-12 rounded-xl bg-[#D4AF37] px-3 text-sm font-black text-black">Approve rights</button>
            <button disabled={busy} onClick={() => { const reason = window.prompt('Why are these dishes being rejected?'); if (reason) void act('reject', [...selected], { reason }) }} className="min-h-12 rounded-xl border border-red-500/40 px-3 text-sm font-black text-red-300">Reject</button>
          </div>
        )}
      </header>

      <div className="mx-auto mt-5 grid max-w-5xl gap-5">
        {(['A', 'B', 'C'] as const).map((bucket) => groups[bucket].length > 0 && (
          <section key={bucket}>
            <h2 className="mb-2 text-sm font-black text-[#D4AF37]">Bucket {bucket} · {groups[bucket].length}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {groups[bucket].map((row) => (
                <article key={row.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#151515]">
                  <button type="button" onClick={() => setPreview(row)} className="relative block h-44 w-full bg-black" aria-label={`View full image for ${row.dish_name}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.image_url} alt={row.dish_name} className="h-full w-full object-cover" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-2 text-xs font-black">View full</span>
                  </button>
                  <div className="p-4">
                    <label className="flex min-h-11 items-start gap-3">
                      <input type="checkbox" checked={selected.has(row.id)} disabled={busy} onChange={(event) => { const next = new Set(selected); event.target.checked ? next.add(row.id) : next.delete(row.id); setSelected(next) }} className="mt-1 h-6 w-6 accent-[#D4AF37]" />
                      <span><b className="block text-lg">{row.dish_name}</b><span className="text-sm text-white/60">{row.place?.name}{row.place?.city ? ` · ${row.place.city}` : ''}</span></span>
                    </label>
                    <p className="mt-2 text-xs text-white/50">{row.bucket_reason}</p>
                    <p className="mt-1 text-xs">Rights: <b className={row.rights_status === 'approved' ? 'text-emerald-400' : row.rights_status === 'rejected' ? 'text-red-400' : 'text-amber-300'}>{row.rights_status}</b>{row.usage_status === 'temporary_staging' ? ' · LIVE' : ''}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" disabled={busy} onClick={() => { setReplaceTarget(row); fileInput.current?.click() }} className="min-h-12 rounded-xl border border-white/15 px-3 text-sm font-black">Replace image</button>
                      {row.usage_status === 'temporary_staging'
                        ? <button type="button" disabled={busy} onClick={() => act('unpublish', [row.id])} className="min-h-12 rounded-xl bg-red-700 px-3 text-sm font-black">Unpublish</button>
                        : row.rights_status === 'approved'
                          ? <button type="button" disabled={busy} onClick={() => act('publish', [row.id])} className="min-h-12 rounded-xl bg-emerald-600 px-3 text-sm font-black">Publish</button>
                          : <button type="button" disabled={busy} onClick={() => { const evidence = window.prompt('Document who granted image permission, when, and where it is recorded:'); if (evidence) void act('approve_rights', [row.id], { permission_evidence: evidence }) }} className="min-h-12 rounded-xl bg-[#D4AF37] px-3 text-sm font-black text-black">Approve rights</button>}
                      <button type="button" disabled={busy} onClick={() => { const reason = window.prompt('Why is this dish being rejected?'); if (reason) void act('reject', [row.id], { reason }) }} className="min-h-12 rounded-xl border border-red-500/40 px-3 text-sm font-black text-red-300">Reject</button>
                      <a href={row.source_url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-bold text-blue-300">View source ↗</a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!items.length && <p className="py-12 text-center text-white/50">No candidates match this view.</p>}
      </div>

      <p className="mx-auto mt-8 max-w-5xl text-xs leading-relaxed text-white/40">Publishing remains locked until image rights are documented. Every approval, rejection, replacement, publish, and emergency unpublish is written to the audit log.</p>
      {preview && <ImagePreviewModal src={preview.image_url} alt={preview.dish_name} onClose={() => setPreview(null)} />}
    </main>
  )
}
