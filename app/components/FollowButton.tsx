'use client'

import { useEffect, useState } from 'react'
import { getAuthToken } from '@/lib/auth'

interface FollowButtonProps {
  followingType: 'user' | 'seller'
  followingId: string
  variant?: 'default' | 'compact'
}

async function api(path: string, init?: RequestInit) {
  const token = await getAuthToken()
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export default function FollowButton({ followingType, followingId, variant = 'default' }: FollowButtonProps) {
  const [following, setFollowing] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    api(`/api/follows?following_type=${followingType}&following_id=${followingId}`)
      .then((data) => { if (mounted) setFollowing(Boolean(data.following)) })
      .catch(() => { if (mounted) setFollowing(false) })
    return () => { mounted = false }
  }, [followingType, followingId])

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (following) {
        await api(`/api/follows?following_type=${followingType}&following_id=${followingId}`, { method: 'DELETE' })
        setFollowing(false)
      } else {
        await api('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_type: followingType, following_id: followingId }),
        })
        setFollowing(true)
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Follow action failed', err)
    } finally {
      setLoading(false)
    }
  }

  if (following === null) {
    return (
      <div className={`${variant === 'compact' ? 'h-9 w-20' : 'h-10 w-24'} rounded-full bg-hs-soft animate-pulse`} />
    )
  }

  const compactClasses = 'h-9 px-3 text-xs'
  const defaultClasses = 'h-10 px-4 text-sm'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`${variant === 'compact' ? compactClasses : defaultClasses} rounded-full font-bold transition border ${
        following
          ? 'bg-hs-charcoal text-hs-cream border-white/20 hover:border-hs-gold/50'
          : 'bg-hs-gold text-hs-black border-hs-gold hover:bg-hs-gold-light'
      } disabled:opacity-50`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
