'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Eye, Heart, RefreshCw, Shield, Trash2, XCircle, Search, QrCode, ExternalLink, Store } from 'lucide-react'
import { PassIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'

interface Submission {
  id: string
  business_name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  status: string
  created_at: string
}

function AdminContent() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [sellers, setSellers] = useState<any[]>([])
  const [dishes, setDishes] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tab, setTab] = useState<'sellers' | 'dishes' | 'submissions'>('sellers')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const login = () => {
    if (secret) setAuthenticated(true)
  }

  const loadData = async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const [sellersRes, dishesRes, subRes] = await Promise.all([
        fetch('/api/admin/sellers', { headers: { 'x-admin-secret': secret } }),
        fetch('/api/admin/dishes', { headers: { 'x-admin-secret': secret } }),
        fetch('/api/admin/business-submissions', { headers: { 'x-admin-secret': secret } }),
      ])
      const sellersData = await sellersRes.json()
      const dishesData = await dishesRes.json()
      const subData = await subRes.json()
      if (sellersData.error || dishesData.error || subData.error) {
        setError(sellersData.error || dishesData.error || subData.error)
      } else {
        setSellers(sellersData.sellers || [])
        setDishes(dishesData.dishes || [])
        setSubmissions(subData.submissions || [])
      }
    } catch {
      setError('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) loadData()
  }, [authenticated])

  const doAction = async (targetType: 'seller' | 'dish', targetId: string, action: string, reason?: string) => {
    const key = `${targetType}:${targetId}:${action}`
    setActionLoading(key)
    try {
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({ targetType, targetId, action, reason }),
      })
      const data = await res.json()
      if (data.success) {
        await loadData()
      } else {
        setError(data.error || 'Action failed')
      }
    } catch {
      setError('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const updateSubmissionStatus = async (id: string, status: string) => {
    setActionLoading(`submission:${id}:${status}`)
    try {
      const res = await fetch('/api/admin/business-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success) {
        await loadData()
      } else {
        setError(data.error || 'Update failed')
      }
    } catch {
      setError('Update failed')
    } finally {
      setActionLoading(null)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hungerswipes.com'

  const filteredSellers = sellers.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.business_name?.toLowerCase().includes(q) ||
      s.slug?.toLowerCase().includes(q) ||
      s.location_text?.toLowerCase().includes(q)
    )
  })

  const renees = sellers.find((s) => s.slug?.toLowerCase() === 'renees')

  const assignOwner = async (seller: any) => {
    const ownerEmail = window.prompt(`Enter the Hunger Swipes account email that should manage ${seller.business_name}:`)
    if (!ownerEmail) return
    setActionLoading(`owner:${seller.id}`)
    try {
      const response = await fetch('/api/admin/sellers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ sellerId: seller.id, ownerEmail }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not assign owner')
      await loadData()
    } catch (reason: any) { setError(reason.message || 'Could not assign owner') }
    finally { setActionLoading(null) }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={24} className="text-[#FF5722]" />
            <h1 className="text-xl font-bold">Hunger Swipes Admin</h1>
          </div>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white mb-4 focus:outline-none focus:border-[#FF5722]"
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          <button onClick={login} className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold">
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <header className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-[#FF5722]" />
          <span className="font-bold">Hunger Swipes Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Refresh admin data" onClick={loadData} className="rounded-lg bg-white/5">
            <RefreshCw size={17} aria-hidden="true" />
          </IconButton>
          <Link href="/swipe" className="inline-flex min-h-11 items-center gap-1 text-sm text-[#FF5722]">
            App <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        {renees && (
          <div className="mb-5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-hs-cream flex items-center gap-2">
                <Store size={18} className="text-[#D4AF37]" /> Renee&apos;s
              </p>
              <p className="text-xs text-hs-gray">Status: {renees.status} · Dishes: {renees.dishes?.length || 0}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/${renees.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold"
              >
                <ExternalLink size={15} /> View live page
              </Link>
              <button onClick={() => assignOwner(renees)} disabled={actionLoading === `owner:${renees.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {renees.owner_user_id ? 'Change owner' : 'Connect owner'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTab('sellers')}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'sellers' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-gray-400'}`}
          >
            Sellers ({sellers.length})
          </button>
          <button
            onClick={() => setTab('dishes')}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'dishes' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-gray-400'}`}
          >
            Dishes ({dishes.length})
          </button>
          <button
            onClick={() => setTab('submissions')}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === 'submissions' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-gray-400'}`}
          >
            Submissions ({submissions.length})
          </button>
        </div>

        {tab === 'sellers' && (
          <div className="mb-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sellers by name, slug, or location"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FF5722] text-sm"
            />
          </div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : tab === 'sellers' ? (
          <div className="space-y-3">
            {filteredSellers.map((seller) => (
              <div key={seller.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{seller.business_name}</p>
                    <p className="text-sm text-gray-400 capitalize">
                      {seller.seller_type?.replace('_', ' ')} · {seller.status}
                    </p>
                    {seller.slug && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        Public URL:{' '}
                        <Link
                          href={`/${seller.slug}`}
                          target="_blank"
                          className="text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                        >
                          {appUrl}/{seller.slug} <ExternalLink size={12} />
                        </Link>
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{seller.location_text || 'No location'} · Dishes: {seller.dishes?.length || 0}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap shrink-0">
                    {(seller.status === 'pending_review' || seller.verification_status === 'pending') && (
                      <>
                        <IconButton
                          label={`Approve ${seller.business_name}`}
                          onClick={() => doAction('seller', seller.id, 'approve')}
                          disabled={actionLoading === `seller:${seller.id}:approve`}
                          className="rounded-lg bg-[#10B981]/20 text-[#10B981]"
                        >
                          <CheckCircle2 size={17} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label={`Reject ${seller.business_name}`}
                          onClick={() => doAction('seller', seller.id, 'reject', 'Does not meet requirements')}
                          disabled={actionLoading === `seller:${seller.id}:reject`}
                          className="rounded-lg bg-red-500/20 text-red-500"
                        >
                          <XCircle size={17} aria-hidden="true" />
                        </IconButton>
                      </>
                    )}
                    {seller.status !== 'active' && seller.status !== 'pending_review' && (
                      <IconButton
                        label={`Activate ${seller.business_name}`}
                        onClick={() => doAction('seller', seller.id, 'activate')}
                        disabled={actionLoading === `seller:${seller.id}:activate`}
                        className="rounded-lg bg-[#10B981]/20 text-[#10B981]"
                      >
                        <CheckCircle2 size={17} aria-hidden="true" />
                      </IconButton>
                    )}
                    {seller.status !== 'suspended' && seller.status !== 'pending_review' && (
                      <IconButton
                        label={`Suspend ${seller.business_name}`}
                        onClick={() => doAction('seller', seller.id, 'suspend', 'Admin moderation')}
                        disabled={actionLoading === `seller:${seller.id}:suspend`}
                        className="rounded-lg bg-amber-500/20 text-amber-500"
                      >
                        <XCircle size={17} aria-hidden="true" />
                      </IconButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredSellers.length === 0 && <p className="text-gray-500 text-sm">No sellers match.</p>}
          </div>
        ) : tab === 'dishes' ? (
          <div className="space-y-3">
            {dishes.map((dish) => (
              <div key={dish.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <img src={dish.photo_url || '/placeholder-dish.png'} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{dish.name}</p>
                    <p className="text-sm text-gray-400 truncate">
                      {dish.seller?.business_name || 'Unknown'} · ${Number(dish.price).toFixed(2)} · {dish.status}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Eye size={13} aria-hidden="true" /> {dish.impressions || 0}</span>
                      <span className="inline-flex items-center gap-1"><Heart size={13} aria-hidden="true" /> {dish.right_swipes || 0}</span>
                      <span className="inline-flex items-center gap-1"><PassIcon size={13} /> {dish.left_swipes || 0}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {dish.status !== 'active' && (
                      <IconButton
                        label={`Activate ${dish.name}`}
                        onClick={() => doAction('dish', dish.id, 'activate')}
                        disabled={actionLoading === `dish:${dish.id}:activate`}
                        className="rounded-lg bg-[#10B981]/20 text-[#10B981]"
                      >
                        <CheckCircle2 size={17} aria-hidden="true" />
                      </IconButton>
                    )}
                    {dish.status !== 'removed' && (
                      <IconButton
                        label={`Remove ${dish.name}`}
                        onClick={() => doAction('dish', dish.id, 'remove', 'Admin moderation')}
                        disabled={actionLoading === `dish:${dish.id}:remove`}
                        className="rounded-lg bg-red-500/20 text-red-500"
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </IconButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-gray-500 text-sm">No business submissions yet.</p>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{sub.business_name}</p>
                      <p className="text-sm text-gray-400">
                        {sub.contact_name || 'No contact'} · {sub.status}
                      </p>
                      <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                        {sub.phone && <p>Phone: {sub.phone}</p>}
                        {sub.email && <p>Email: {sub.email}</p>}
                        {sub.address && <p>{sub.address}</p>}
                        {sub.website && <p>Website: {sub.website}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap shrink-0">
                      {sub.status === 'new' && (
                        <>
                          <button
                            onClick={() => updateSubmissionStatus(sub.id, 'contacted')}
                            disabled={actionLoading === `submission:${sub.id}:contacted`}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white"
                          >
                            Mark contacted
                          </button>
                          <button
                            onClick={() => updateSubmissionStatus(sub.id, 'approved')}
                            disabled={actionLoading === `submission:${sub.id}:approved`}
                            className="px-3 py-1.5 rounded-lg bg-[#10B981]/20 text-xs font-semibold text-[#10B981]"
                          >
                            Approve
                          </button>
                        </>
                      )}
                      {sub.status !== 'declined' && (
                        <button
                          onClick={() => updateSubmissionStatus(sub.id, 'declined')}
                          disabled={actionLoading === `submission:${sub.id}:declined`}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-xs font-semibold text-red-500"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center">Loading...</div>}>
      <AdminContent />
    </Suspense>
  )
}
