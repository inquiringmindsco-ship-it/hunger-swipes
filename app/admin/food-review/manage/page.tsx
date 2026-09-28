'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Search, Trash2, AlertCircle, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ManagedPost {
  id: string
  photo_url: string
  dish_name: string
  creator_name: string
  moderation_status: string
  moderation_reason?: string
  created_at: string
  deleted_at?: string
  deletion_reason?: string
  place?: { id: string; name: string }
  user?: { email?: string }
}

const REASONS = [
  { value: 'not_food', label: 'Not food' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'wrong_dish', label: 'Wrong dish' },
  { value: 'wrong_restaurant', label: 'Wrong restaurant' },
  { value: 'poor_misleading', label: 'Poor / misleading' },
  { value: 'user_request', label: 'User request' },
  { value: 'other', label: 'Other' },
]

export default function FoodReviewManagePage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [posts, setPosts] = useState<ManagedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [rowReasons, setRowReasons] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&limit=200` : '?limit=200'
      const res = await fetch(`/api/admin/food-review/manage${qs}`, {
        headers: { 'x-admin-secret': secret },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPosts(data.posts || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [secret, statusFilter])

  useEffect(() => {
    if (authenticated) load()
  }, [authenticated, load])

  const remove = async (id: string) => {
    const reason = rowReasons[id]
    if (!reason) return
    setRemovingId(id)
    try {
      const res = await fetch('/api/admin/food-review/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ postId: id, action: 'remove', reason }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, moderation_status: 'removed', deleted_at: new Date().toISOString(), deletion_reason: reason } : p)))
    } catch (err: any) {
      setError(err.message || 'Remove failed')
    } finally {
      setRemovingId(null)
    }
  }

  const filtered = posts.filter((p) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      p.dish_name.toLowerCase().includes(q) ||
      p.creator_name.toLowerCase().includes(q) ||
      p.place?.name?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q)
    )
  })

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle size={16} className="text-green-400" />
    if (status === 'rejected') return <XCircle size={16} className="text-red-400" />
    if (status === 'removed') return <Trash2 size={16} className="text-gray-400" />
    return <HelpCircle size={16} className="text-yellow-400" />
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-4">Photo Management</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white mb-4 focus:outline-none focus:border-[#FF5722]"
            onKeyDown={(e) => e.key === 'Enter' && setAuthenticated(true)}
          />
          <button onClick={() => setAuthenticated(true)} className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold">
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <header className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/food-review" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold">All Community Photos</h1>
        </div>
        <Link href="/admin" className="text-sm text-[#FF5722]">
          Admin
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search dish, contributor, place..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FF5722] text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF5722]"
          >
            <option value="">All statuses</option>
            <option value="pending_review">Needs review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="removed">Removed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#FF5722]" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No photos match this filter.</p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((post) => (
              <div key={post.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex gap-4">
                <img src={post.photo_url} alt={post.dish_name} className="w-24 h-24 object-cover rounded-lg bg-black flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(post.moderation_status)}
                    <span className="font-semibold truncate">{post.dish_name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {timeAgo(post.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{post.place?.name} · {post.creator_name}</p>
                  {post.moderation_reason && <p className="text-xs text-gray-500 mt-1">{post.moderation_reason}</p>}
                  {post.deleted_at && <p className="text-xs text-red-400 mt-1">Removed: {post.deletion_reason}</p>}

                  {post.moderation_status !== 'removed' && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <select
                        value={rowReasons[post.id] || ''}
                        onChange={(e) => setRowReasons((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#FF5722]"
                      >
                        <option value="">Reason…</option>
                        {REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => remove(post.id)}
                        disabled={removingId === post.id || !rowReasons[post.id]}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {removingId === post.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
