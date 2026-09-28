'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, ThumbsDown, ThumbsUp, Trash2, X, AlertCircle } from 'lucide-react'

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

interface ReviewPost {
  id: string
  photo_url: string
  dish_name: string
  description?: string
  creator_name: string
  moderation_status: string
  moderation_reason?: string
  moderation_confidence?: number
  moderation_service?: string
  created_at: string
  place: { id: string; name: string; location_text?: string }
  user?: { id: string; email?: string; raw_user_meta_data?: { full_name?: string } }
}

const REASONS = [
  { value: 'not_food', label: 'Not food' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'wrong_dish', label: 'Wrong dish' },
  { value: 'wrong_restaurant', label: 'Wrong restaurant' },
  { value: 'poor_misleading', label: 'Poor / misleading content' },
  { value: 'user_request', label: 'User request' },
  { value: 'other', label: 'Other' },
]

export default function FoodReviewPage() {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [posts, setPosts] = useState<ReviewPost[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({ needs_review: 0, approved_today: 0, rejected_today: 0 })
  const [error, setError] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [removeReason, setRemoveReason] = useState('')
  const [showRemove, setShowRemove] = useState(false)
  const touchStartX = useRef(0)

  const load = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/food-review?status=pending_review&limit=50', {
        headers: { 'x-admin-secret': secret },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPosts(data.posts || [])
      setCounts(data.counts || { needs_review: 0, approved_today: 0, rejected_today: 0 })
      setIndex(0)
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue')
    } finally {
      setLoading(false)
    }
  }, [secret])

  useEffect(() => {
    if (authenticated) load()
  }, [authenticated, load])

  const decide = async (action: 'approve' | 'reject') => {
    const post = posts[index]
    if (!post || deciding) return
    setDeciding(true)
    try {
      const res = await fetch('/api/admin/food-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ postId: post.id, action, reason: action === 'reject' ? 'Admin rejected via Food Review' : undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      next()
    } catch (err: any) {
      setError(err.message || 'Decision failed')
    } finally {
      setDeciding(false)
    }
  }

  const removeCurrent = async () => {
    const post = posts[index]
    if (!post || deciding) return
    setDeciding(true)
    try {
      const res = await fetch('/api/admin/food-review/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ postId: post.id, action: 'remove', reason: removeReason || 'other' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setShowRemove(false)
      setRemoveReason('')
      next()
    } catch (err: any) {
      setError(err.message || 'Remove failed')
    } finally {
      setDeciding(false)
    }
  }

  const next = () => {
    if (index + 1 < posts.length) {
      setIndex((i) => i + 1)
    } else {
      load()
    }
  }

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide('approve')
      else if (e.key === 'ArrowLeft') decide('reject')
    },
    [posts, index]
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].screenX - touchStartX.current
    if (Math.abs(diff) < 60) return
    if (diff > 0) decide('approve')
    else decide('reject')
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-4">Food Review</h1>
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

  const post = posts[index]

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <header className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold">Food Review</h1>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>Needs review: <strong className="text-white">{counts.needs_review}</strong></span>
              <span>Approved today: <strong className="text-green-400">{counts.approved_today}</strong></span>
              <span>Rejected today: <strong className="text-red-400">{counts.rejected_today}</strong></span>
            </div>
          </div>
        </div>
        <Link href="/admin/food-review/manage" className="text-sm text-[#FF5722]">
          Manage all
        </Link>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#FF5722]" size={32} />
          </div>
        ) : !post ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-semibold">No photos need review 🎉</p>
            <p className="text-sm mt-1">Check back later or view all photos in Manage.</p>
          </div>
        ) : (
          <div
            className="relative"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-white/10 mb-4 relative">
              <img
                src={post.photo_url}
                alt={post.dish_name}
                className="w-full h-full object-cover"
                draggable={false}
              />
              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                {index + 1} / {posts.length}
              </div>
            </div>

            <div className="space-y-1 mb-5">
              <p className="text-xl font-bold">{post.dish_name}</p>
              <p className="text-sm text-gray-400">{post.place?.name}{post.place?.location_text ? ` · ${post.place.location_text}` : ''}</p>
              <p className="text-sm text-gray-400">
                by {post.creator_name || post.user?.email} · {timeAgo(post.created_at)}
              </p>
              {post.moderation_reason && (
                <p className="text-xs text-yellow-400 mt-2 flex items-start gap-1">
                  <AlertCircle size={14} className="mt-0.5" />
                  {post.moderation_reason}
                </p>
              )}
              {post.moderation_service && (
                <p className="text-xs text-gray-500">Service: {post.moderation_service} {post.moderation_confidence != null && `· ${Math.round(post.moderation_confidence * 100)}%`}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => decide('reject')}
                disabled={deciding}
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/20 text-red-400 font-bold disabled:opacity-50"
              >
                <ThumbsDown size={20} /> Reject
              </button>
              <button
                onClick={() => decide('approve')}
                disabled={deciding}
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-green-500/20 text-green-400 font-bold disabled:opacity-50"
              >
                <ThumbsUp size={20} /> Approve
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><ArrowLeft size={12} /> Left = Reject</span>
              <span className="flex items-center gap-1">Right = Approve <ArrowLeft size={12} className="rotate-180" /></span>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                onClick={() => setShowRemove(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-gray-400 text-sm font-semibold hover:bg-white/10"
              >
                <Trash2 size={16} /> Remove photo
              </button>
            </div>
          </div>
        )}

        {showRemove && post && (
          <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 w-full max-w-sm">
              <h2 className="font-bold mb-3">Remove this photo?</h2>
              <p className="text-sm text-gray-400 mb-4">
                This will remove &quot;{post.dish_name}&quot; from Hunger Swipes and stop future Swipe Bucks. Ledger history is preserved.
              </p>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="removeReason"
                      value={r.value}
                      checked={removeReason === r.value}
                      onChange={(e) => setRemoveReason(e.target.value)}
                      className="accent-[#FF5722]"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setShowRemove(false); setRemoveReason('') }} className="py-3 rounded-xl bg-white/5 text-white font-semibold">
                  Cancel
                </button>
                <button
                  onClick={removeCurrent}
                  disabled={!removeReason || deciding}
                  className="py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-50"
                >
                  {deciding ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
