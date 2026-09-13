'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react'

function AdminContent() {
  const params = useSearchParams()
  const [secret, setSecret] = useState(params.get('secret') || '')
  const [authenticated, setAuthenticated] = useState(false)
  const [sellers, setSellers] = useState<any[]>([])
  const [dishes, setDishes] = useState<any[]>([])
  const [tab, setTab] = useState<'sellers' | 'dishes'>('sellers')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const login = () => {
    if (secret) setAuthenticated(true)
  }

  const loadData = async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const [sellersRes, dishesRes] = await Promise.all([
        fetch('/api/admin/sellers', { headers: { 'x-admin-secret': secret } }),
        fetch('/api/admin/dishes', { headers: { 'x-admin-secret': secret } }),
      ])
      const sellersData = await sellersRes.json()
      const dishesData = await dishesRes.json()
      if (sellersData.error || dishesData.error) {
        setError(sellersData.error || dishesData.error)
      } else {
        setSellers(sellersData.sellers || [])
        setDishes(dishesData.dishes || [])
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
          <button
            onClick={login}
            className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold"
          >
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
          <button onClick={loadData} className="p-2 bg-white/5 rounded-lg">
            <RefreshCw size={16} />
          </button>
          <Link href="/swipe" className="text-sm text-[#FF5722]">App →</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-4">
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
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : tab === 'sellers' ? (
          <div className="space-y-3">
            {sellers.map((seller) => (
              <div key={seller.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{seller.business_name}</p>
                    <p className="text-sm text-gray-400 capitalize">{seller.seller_type?.replace('_', ' ')} · {seller.status}</p>
                    <p className="text-xs text-gray-500 mt-1">{seller.location_text}</p>
                    <p className="text-xs text-gray-500">Dishes: {seller.dishes?.length || 0}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(seller.status === 'pending_review' || seller.verification_status === 'pending') && (
                      <>
                        <button
                          onClick={() => doAction('seller', seller.id, 'approve')}
                          disabled={actionLoading === `seller:${seller.id}:approve`}
                          className="p-2 bg-[#10B981]/20 text-[#10B981] rounded-lg"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => doAction('seller', seller.id, 'reject', 'Does not meet requirements')}
                          disabled={actionLoading === `seller:${seller.id}:reject`}
                          className="p-2 bg-red-500/20 text-red-500 rounded-lg"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {seller.status !== 'active' && seller.status !== 'pending_review' && (
                      <button
                        onClick={() => doAction('seller', seller.id, 'activate')}
                        disabled={actionLoading === `seller:${seller.id}:activate`}
                        className="p-2 bg-[#10B981]/20 text-[#10B981] rounded-lg"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {seller.status !== 'suspended' && seller.status !== 'pending_review' && (
                      <button
                        onClick={() => doAction('seller', seller.id, 'suspend', 'Admin moderation')}
                        disabled={actionLoading === `seller:${seller.id}:suspend`}
                        className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {dishes.map((dish) => (
              <div key={dish.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <img src={dish.photo_url || '/placeholder-dish.png'} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-bold">{dish.name}</p>
                    <p className="text-sm text-gray-400">{dish.seller?.business_name || 'Unknown'} · ${Number(dish.price).toFixed(2)} · {dish.status}</p>
                    <p className="text-xs text-gray-500 mt-1">👁 {dish.impressions || 0} · 👍 {dish.right_swipes || 0} · 👎 {dish.left_swipes || 0}</p>
                  </div>
                  <div className="flex gap-1">
                    {dish.status !== 'active' && (
                      <button
                        onClick={() => doAction('dish', dish.id, 'activate')}
                        disabled={actionLoading === `dish:${dish.id}:activate`}
                        className="p-2 bg-[#10B981]/20 text-[#10B981] rounded-lg"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {dish.status !== 'removed' && (
                      <button
                        onClick={() => doAction('dish', dish.id, 'remove', 'Admin moderation')}
                        disabled={actionLoading === `dish:${dish.id}:remove`}
                        className="p-2 bg-red-500/20 text-red-500 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
