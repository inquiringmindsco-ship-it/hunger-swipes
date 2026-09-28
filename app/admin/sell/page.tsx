'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Eye, Shield, Trash2, XCircle, Play } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'

export default function SellAdminPage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [tab, setTab] = useState<'sellers' | 'recipes' | 'videos'>('sellers')
  const [sellers, setSellers] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const login = () => { if (secret) setAuthenticated(true) }

  const load = async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const [sRes, rRes, mRes] = await Promise.all([
        fetch('/api/admin/sellers', { headers: { 'x-admin-secret': secret } }),
        fetch('/api/admin/recipes', { headers: { 'x-admin-secret': secret } }),
        fetch('/api/admin/media', { headers: { 'x-admin-secret': secret } }),
      ])
      const s = await sRes.json()
      const r = await rRes.json()
      const m = await mRes.json()
      if (s.error || r.error || m.error) setError(s.error || r.error || m.error)
      setSellers(s.sellers || [])
      setRecipes(r.recipes || [])
      setMedia(m.media || [])
    } catch {
      setError('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (authenticated) load() }, [authenticated, secret])

  const toggleSellerStatus = async (seller: any, status: string) => {
    setActionId(seller.id)
    try {
      const res = await fetch(`/api/admin/sellers?id=${seller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else load()
    } finally { setActionId(null) }
  }

  const updateRecipe = async (recipe: any, patch: any) => {
    setActionId(recipe.id)
    try {
      const res = await fetch(`/api/admin/recipes?id=${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else load()
    } finally { setActionId(null) }
  }

  const updateMedia = async (item: any, patch: any) => {
    setActionId(item.id)
    try {
      const res = await fetch(`/api/admin/media?id=${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else load()
    } finally { setActionId(null) }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-hs-ink flex flex-col items-center justify-center px-4">
        <BrandMark size={48} className="mb-6" />
        <h1 className="text-2xl font-black text-hs-cream mb-4">Sell Admin</h1>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="w-full max-w-xs px-4 py-3 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none mb-3"
        />
        <button onClick={login} className="px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold">Enter</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-hs-gray hover:text-hs-cream transition">
              <ArrowLeft size={20} />
            </Link>
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Sell Admin</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {(['sellers','recipes','videos'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 rounded-xl font-semibold capitalize transition ${tab === t ? 'bg-hs-gold text-hs-black' : 'text-hs-gray hover:text-hs-cream hover:bg-hs-soft'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && <p className="text-hs-red text-sm mb-4">{error}</p>}
        {loading && <p className="text-hs-gray text-sm">Loading…</p>}

        {tab === 'sellers' && (
          <div className="space-y-3">
            {sellers.map((s) => (
              <div key={s.id} className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-hs-cream">{s.business_name}</p>
                    <p className="text-xs text-hs-gray">{(s.seller_types || [s.seller_type]).join(', ')} • {s.location_text}</p>
                    <p className="text-xs text-hs-gold mt-1">Status: {s.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {s.status !== 'active' && <button disabled={actionId === s.id} onClick={() => toggleSellerStatus(s, 'active')} className="p-2 rounded-xl bg-hs-success/10 text-hs-success"><CheckCircle2 size={16} /></button>}
                    {s.status !== 'suspended' && <button disabled={actionId === s.id} onClick={() => toggleSellerStatus(s, 'suspended')} className="p-2 rounded-xl bg-hs-red/10 text-hs-red"><XCircle size={16} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'recipes' && (
          <div className="space-y-3">
            {recipes.map((r) => (
              <div key={r.id} className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {r.photo_url && <img src={r.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                  <div className="flex-1">
                    <p className="font-bold text-hs-cream">{r.title}</p>
                    <p className="text-xs text-hs-gray">${Number(r.price).toFixed(2)} • {r.published ? 'Published' : 'Draft'} • {r.status}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button disabled={actionId === r.id} onClick={() => updateRecipe(r, { published: !r.published })} className="px-3 py-2 rounded-xl bg-hs-soft text-xs font-semibold text-hs-cream">{r.published ? 'Unpublish' : 'Publish'}</button>
                  {r.status !== 'removed' && <button disabled={actionId === r.id} onClick={() => updateRecipe(r, { status: 'removed' })} className="px-3 py-2 rounded-xl bg-hs-red/10 text-xs font-semibold text-hs-red">Remove</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'videos' && (
          <div className="space-y-3">
            {media.map((m) => (
              <div key={m.id} className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {m.thumbnail_path && <img src={m.thumbnail_path} alt="" className="w-24 h-16 rounded-xl object-cover" />}
                  <div className="flex-1">
                    <p className="font-bold text-hs-cream text-sm">{Math.round(m.duration_seconds || 0)}s • {m.processing_status} • {m.moderation_status}</p>
                    <p className="text-xs text-hs-gray">{m.moderation_reason}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {m.moderation_status !== 'approved' && <button disabled={actionId === m.id} onClick={() => updateMedia(m, { moderation_status: 'approved' })} className="px-3 py-2 rounded-xl bg-hs-success/10 text-xs font-semibold text-hs-success">Approve</button>}
                  {m.moderation_status !== 'rejected' && <button disabled={actionId === m.id} onClick={() => updateMedia(m, { moderation_status: 'rejected' })} className="px-3 py-2 rounded-xl bg-hs-red/10 text-xs font-semibold text-hs-red">Reject</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
