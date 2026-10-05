'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Eye, Heart, RefreshCw, Shield, Trash2, XCircle, Search, QrCode, ExternalLink, Store, Wallet, Camera } from 'lucide-react'
import { PassIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import { adminFetch } from '@/lib/admin-fetch'

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
  const [tab, setTab] = useState<'sellers' | 'dishes' | 'submissions' | 'swipe_bucks' | 'redemption' | 'food_review'>('sellers')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [swipeBucksConfig, setSwipeBucksConfig] = useState<any>(null)
  const [swipeBucksStats, setSwipeBucksStats] = useState<any>(null)
  const [swipeBucksLoading, setSwipeBucksLoading] = useState(false)
  const [redemptionConfig, setRedemptionConfig] = useState<any>(null)
  const [redemptionStats, setRedemptionStats] = useState<any>(null)
  const [redemptionRestaurants, setRedemptionRestaurants] = useState<any[]>([])
  const [redemptionUsers, setRedemptionUsers] = useState<any[]>([])
  const [redemptionLoading, setRedemptionLoading] = useState(false)

  const login = async () => {
    if (secret) setAuthenticated(true)
  }

  useEffect(() => {
    adminFetch('/api/admin/session')
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false))
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sellersRes, dishesRes, subRes] = await Promise.all([
        adminFetch('/api/admin/sellers', { headers: { 'x-admin-secret': secret } }),
        adminFetch('/api/admin/dishes', { headers: { 'x-admin-secret': secret } }),
        adminFetch('/api/admin/business-submissions', { headers: { 'x-admin-secret': secret } }),
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

  const loadSwipeBucks = async () => {
    setSwipeBucksLoading(true)
    try {
      const [configRes, statsRes] = await Promise.all([
        adminFetch('/api/swipe-bucks/config', { headers: { 'x-admin-secret': secret } }),
        adminFetch('/api/swipe-bucks/stats', { headers: { 'x-admin-secret': secret } }),
      ])
      const configData = await configRes.json()
      const statsData = await statsRes.json()
      setSwipeBucksConfig(configData.config)
      setSwipeBucksStats(statsData)
    } catch {
      setError('Failed to load Swipe Bucks admin data')
    } finally {
      setSwipeBucksLoading(false)
    }
  }

  const loadRedemption = async () => {
    setRedemptionLoading(true)
    try {
      const [configRes, statsRes, restaurantsRes, usersRes] = await Promise.all([
        adminFetch('/api/swipe-bucks/redemption/config', { headers: { 'x-admin-secret': secret } }),
        adminFetch('/api/swipe-bucks/redemption/stats', { headers: { 'x-admin-secret': secret } }),
        adminFetch('/api/swipe-bucks/redemption/restaurants', { headers: { 'x-admin-secret': secret } }),
        adminFetch('/api/swipe-bucks/redemption/users', { headers: { 'x-admin-secret': secret } }),
      ])
      const [configData, statsData, restaurantsData, usersData] = await Promise.all([
        configRes.json(), statsRes.json(), restaurantsRes.json(), usersRes.json(),
      ])
      setRedemptionConfig(configData.config)
      setRedemptionStats(statsData)
      setRedemptionRestaurants(restaurantsData.restaurants || [])
      setRedemptionUsers(usersData.users || [])
    } catch {
      setError('Failed to load redemption data')
    } finally {
      setRedemptionLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) loadData()
  }, [authenticated])

  useEffect(() => {
    if (authenticated && tab === 'swipe_bucks') loadSwipeBucks()
  }, [authenticated, tab])

  useEffect(() => {
    if (authenticated && tab === 'redemption') loadRedemption()
  }, [authenticated, tab])

  const doAction = async (targetType: 'seller' | 'dish', targetId: string, action: string, reason?: string) => {
    const key = `${targetType}:${targetId}:${action}`
    setActionLoading(key)
    try {
      const res = await adminFetch('/api/admin/suspend', {
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
      const res = await adminFetch('/api/admin/business-submissions', {
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
      const response = await adminFetch('/api/admin/sellers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ sellerId: seller.id, ownerEmail }) })
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
          <Link href="/auth?next=/admin" className="mb-4 block rounded-xl bg-[#FF5722] px-4 py-3 text-center font-bold text-white">
            Sign in as an authorized owner
          </Link>
          <p className="mb-3 text-center text-xs text-white/50">Temporary compatibility access</p>
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
          <button
            onClick={() => setTab('food_review')}
            className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${tab === 'food_review' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-gray-400'}`}
          >
            <Camera size={16} /> Food Review
          </button>
          <button
            onClick={() => setTab('redemption')}
            className={`px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${tab === 'redemption' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-gray-400'}`}
          >
            <Shield size={16} /> Redemption
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
        ) : tab === 'submissions' ? (
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
        ) : null}

        {tab === 'swipe_bucks' && <SwipeBucksAdmin secret={secret} config={swipeBucksConfig} stats={swipeBucksStats} loading={swipeBucksLoading} onUpdate={loadSwipeBucks} />}
        {tab === 'food_review' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Review and manage community food photos. Only approved photos appear in Discover and earn Swipe Bucks.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/food-review"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF5722] text-white rounded-xl font-bold"
              >
                Open Food Review →
              </Link>
              <Link
                href="/admin/food-review/manage"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/5 text-white rounded-xl font-semibold"
              >
                Manage all photos
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function SwipeBucksAdmin({ secret, config, stats, loading, onUpdate }: { secret: string; config: any; stats: any; loading: boolean; onUpdate: () => void }) {
  const [edit, setEdit] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ user_id: '', amount_cents: '', type: 'credit', reason: '', post_id: '' })
  const [manualLoading, setManualLoading] = useState(false)

  useEffect(() => { if (config) setEdit({ ...config }) }, [config])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await adminFetch('/api/swipe-bucks/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(edit),
      })
      if (!res.ok) throw new Error('Save failed')
      onUpdate()
    } catch (e) {
      alert('Failed to save config')
    }
    setSaving(false)
  }

  const submitManual = async () => {
    setManualLoading(true)
    try {
      const res = await adminFetch('/api/swipe-bucks/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({
          user_id: manual.user_id,
          amount_cents: parseInt(manual.amount_cents, 10),
          type: manual.type,
          reason: manual.reason,
          post_id: manual.post_id || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setManual({ user_id: '', amount_cents: '', type: 'credit', reason: '', post_id: '' })
      setManualOpen(false)
      onUpdate()
    } catch (e: any) {
      alert(e.message || 'Manual entry failed')
    }
    setManualLoading(false)
  }

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

  if (loading) return <div className="text-gray-500 text-sm">Loading Swipe Bucks…</div>

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Outstanding" value={fmt(stats.outstanding_cents || 0)} />
          <Stat label="Issued today" value={fmt(stats.issued_today_cents || 0)} />
          <Stat label="Issued this month" value={fmt(stats.issued_month_cents || 0)} />
          <Stat label="Redeemed today" value={fmt(stats.redeemed_today_cents || 0)} />
          <Stat label="Redeemed this month" value={fmt(stats.redeemed_month_cents || 0)} />
        </div>
      )}

      {config && edit && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Reward configuration</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edit.active}
                onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'right_swipe_cents', label: 'Right swipe' },
              { key: 'save_cents', label: 'Save/match' },
              { key: 'click_cents', label: 'Order click' },
              { key: 'verified_order_cents', label: 'Verified order' },
              { key: 'first_photo_cents', label: 'First photo bonus' },
            ].map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="text-gray-400">{f.label} (¢)</span>
                <input
                  type="number"
                  value={edit[f.key]}
                  onChange={(e) => setEdit({ ...edit, [f.key]: parseInt(e.target.value || '0', 10) })}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'daily_cap_cents', label: 'Daily cap' },
              { key: 'monthly_cap_cents', label: 'Monthly cap' },
              { key: 'max_per_post_cents', label: 'Max per post' },
              { key: 'global_budget_cents', label: 'Global budget' },
            ].map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="text-gray-400">{f.label} (¢)</span>
                <input
                  type="number"
                  value={edit[f.key]}
                  onChange={(e) => setEdit({ ...edit, [f.key]: parseInt(e.target.value || '0', 10) })}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </label>
            ))}
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-[#FF5722] text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save config'}
          </button>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Manual adjustment</h3>
          <button onClick={() => setManualOpen(!manualOpen)} className="text-sm text-[#FF5722]">
            {manualOpen ? 'Cancel' : 'New adjustment'}
          </button>
        </div>
        {manualOpen && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="User ID"
                value={manual.user_id}
                onChange={(e) => setManual({ ...manual, user_id: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <input
                type="number"
                placeholder="Amount (cents)"
                value={manual.amount_cents}
                onChange={(e) => setManual({ ...manual, amount_cents: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
            <select
              value={manual.type}
              onChange={(e) => setManual({ ...manual, type: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="credit">Manual credit</option>
              <option value="reversal">Manual reversal</option>
            </select>
            <input
              type="text"
              placeholder="Reason (required)"
              value={manual.reason}
              onChange={(e) => setManual({ ...manual, reason: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
            <input
              type="text"
              placeholder="Post ID (optional)"
              value={manual.post_id}
              onChange={(e) => setManual({ ...manual, post_id: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
            <button
              onClick={submitManual}
              disabled={manualLoading || !manual.user_id || !manual.amount_cents || !manual.reason}
              className="px-4 py-2 bg-[#FF5722] text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {manualLoading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        )}
      </div>

      {stats?.top_users?.length > 0 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <h3 className="font-bold mb-3">Top users</h3>
          <div className="space-y-2 text-sm">
            {stats.top_users.map((row: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-400 font-mono truncate max-w-[60%]">{row.user_id}</span>
                <span className="text-hs-cream font-semibold">{fmt(row.sum || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.suspicious?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <h3 className="font-bold text-red-400 mb-3">Suspicious activity</h3>
          <div className="space-y-2 text-sm">
            {stats.suspicious.map((row: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-400 font-mono truncate max-w-[60%]">{row.user_id}</span>
                <span className="text-red-400 font-semibold">{row.count} events today</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RedemptionAdmin({ secret, config, stats, restaurants, users, loading, onUpdate }: { secret: string; config: any; stats: any; restaurants: any[]; users: any[]; loading: boolean; onUpdate: () => void }) {
  const [edit, setEdit] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideTarget, setOverrideTarget] = useState<{ user_id?: string; restaurant_id?: string; action: string } | null>(null)

  useEffect(() => { if (config) setEdit({ ...config }) }, [config])

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await adminFetch('/api/swipe-bucks/redemption/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(edit),
      })
      if (!res.ok) throw new Error('Save failed')
      onUpdate()
    } catch (e) {
      alert('Failed to save redemption config')
    }
    setSaving(false)
  }

  const doOverride = async () => {
    if (!overrideTarget || !overrideReason.trim()) return
    try {
      const res = await adminFetch('/api/swipe-bucks/redemption/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ ...overrideTarget, reason: overrideReason }),
      })
      if (!res.ok) throw new Error(await res.text())
      setOverrideTarget(null)
      setOverrideReason('')
      onUpdate()
    } catch (e: any) {
      alert(e.message || 'Override failed')
    }
  }

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

  if (loading) return <div className="text-gray-500 text-sm">Loading redemption guardrails…</div>

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Redemption" value={stats.redemption_enabled ? 'ON' : 'OFF'} />
          <Stat label="Global budget" value={fmt(stats.global_monthly_budget_cents || 0)} />
          <Stat label="Redeemed this month" value={fmt(stats.global_redeemed_this_month_cents || 0)} />
          <Stat label="Remaining" value={fmt(stats.global_remaining_cents || 0)} />
          <Stat label="Outstanding" value={fmt(stats.outstanding_cents || 0)} />
          <Stat label="Restricted" value={fmt(stats.restricted_cents || 0)} />
        </div>
      )}

      {config && edit && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Redemption controls</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edit.redemption_enabled}
                onChange={(e) => setEdit({ ...edit, redemption_enabled: e.target.checked })}
              />
              Enable redemption
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'monthly_redemption_cap_cents', label: 'Monthly per-user cap' },
              { key: 'daily_redemption_cap_cents', label: 'Daily per-user cap' },
              { key: 'max_redemption_per_transaction_cents', label: 'Per-transaction max' },
              { key: 'global_monthly_redemption_budget_cents', label: 'Global monthly budget' },
            ].map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="text-gray-400">{f.label} ($)</span>
                <input
                  type="number"
                  value={(edit[f.key] || 0) / 100}
                  onChange={(e) => setEdit({ ...edit, [f.key]: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </label>
            ))}
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-[#FF5722] text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save redemption config'}
          </button>
        </div>
      )}

      {stats?.restricted_users?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <h3 className="font-bold text-red-400 mb-3">Restricted / review accounts</h3>
          <div className="space-y-2 text-sm">
            {stats.restricted_users.map((row: any) => (
              <div key={row.user_id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-gray-400 font-mono truncate">{row.user_id}</p>
                  <p className="text-xs text-gray-500">{row.redemption_status} · {fmt(row.restricted_cents || 0)}</p>
                  {row.risk_flags?.length > 0 && <p className="text-xs text-red-400">{row.risk_flags.join(', ')}</p>}
                </div>
                <button
                  onClick={() => setOverrideTarget({ user_id: row.user_id, action: 'release_hold' })}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white shrink-0"
                >
                  Release
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.near_cap_users?.length > 0 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <h3 className="font-bold mb-3">Users near monthly cap</h3>
          <div className="space-y-2 text-sm">
            {stats.near_cap_users.map((row: any) => (
              <div key={row.user_id} className="flex justify-between">
                <span className="text-gray-400 font-mono truncate max-w-[60%]">{row.user_id}</span>
                <span className="text-hs-cream font-semibold">{fmt(row.lifetime_redeemed_cents || 0)} redeemed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {restaurants.length > 0 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <h3 className="font-bold mb-3">Restaurant limits</h3>
          <div className="space-y-3 text-sm">
            {restaurants.map((r: any) => (
              <div key={r.restaurant_id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{r.restaurant?.name || r.restaurant_id}</p>
                  <p className="text-gray-400 text-xs">
                    Allowance {fmt(r.monthly_redemption_allowance_cents || 0)} ·
                    Redemption {r.redemption_enabled ? 'ON' : 'OFF'}
                  </p>
                </div>
                <button
                  onClick={() => setOverrideTarget({ restaurant_id: r.restaurant_id, action: r.redemption_enabled ? 'disable_restaurant' : 'enable_restaurant' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${r.redemption_enabled ? 'bg-red-500/20 text-red-500' : 'bg-[#10B981]/20 text-[#10B981]'}`}
                >
                  {r.redemption_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {overrideTarget && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
          <h3 className="font-bold">Override: {overrideTarget.action.replace(/_/g, ' ')}</h3>
          <input
            type="text"
            placeholder="Reason (required)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          />
          <div className="flex gap-2">
            <button onClick={doOverride} disabled={!overrideReason.trim()} className="px-4 py-2 bg-[#FF5722] text-white rounded-lg font-semibold disabled:opacity-50">Confirm</button>
            <button onClick={() => setOverrideTarget(null)} className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className="text-lg font-bold text-hs-cream">{value}</p>
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
