'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AtSign, User, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth, getAuthToken } from '@/lib/auth'
import { BrandMark, ProfileIcon } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'

const RESERVED = new Set([
  'api','admin','swipe','saved','account','auth','join','login','logout','profile','profiles','seller','sellers',
  'dishes','recipes','videos','images','static','_next','favicon','robots','sitemap','manifest','explore','eat','make',
  'stripe','connect','webhook','checkout','payment','payments','follows','impact','health','status','terms','privacy',
  'about','contact','support','help','blog','jobs','press','partners','affiliates','advertise','business','creator',
  'home','feed','discover','nearby','trending','popular','search','settings','notifications','messages','inbox','users',
])

const HANDLE_RE = /^[a-zA-Z0-9_]{2,32}$/

function normalizeHandle(h: string): string | null {
  const trimmed = h.trim().toLowerCase().replace(/^@/, '')
  if (!HANDLE_RE.test(trimmed)) return null
  if (RESERVED.has(trimmed)) return null
  return trimmed
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

export default function AccountProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [handle, setHandle] = useState('')
  const [handleExists, setHandleExists] = useState(false)
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setInitialLoad(false)
      return
    }
    Promise.all([
      api('/api/handles'),
      api('/api/profiles'),
    ])
      .then(([handleData, profileData]) => {
        if (handleData.handle?.handle) {
          setHandle(handleData.handle.handle)
          setHandleExists(true)
        }
        const p = profileData.profile || {}
        setBio(p.bio || '')
        setWebsiteUrl(p.website_url || '')
        setInstagramHandle(p.instagram_handle || '')
        setTiktokHandle(p.tiktok_handle || '')
        setYoutubeUrl(p.youtube_url || '')
      })
      .catch(() => setError('Could not load profile.'))
      .finally(() => setInitialLoad(false))
  }, [user, authLoading])

  const validateHandle = (value: string) => {
    const normalized = normalizeHandle(value)
    if (!normalized) {
      setError('Handle must be 2–32 letters, numbers, or underscores and not a reserved word.')
      return null
    }
    setError('')
    return normalized
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const normalized = validateHandle(handle)
      if (!normalized) {
        setSaving(false)
        return
      }

      // Claim or update handle
      const handleRes = await api('/api/handles', { method: handleExists ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: normalized }) })
      if (handleRes.error) throw new Error(handleRes.error)

      // Update profile
      const profileBody: any = { bio, website_url: websiteUrl || null, instagram_handle: instagramHandle || null, tiktok_handle: tiktokHandle || null, youtube_url: youtubeUrl || null }
      const profileRes = await api('/api/profiles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileBody) })
      if (profileRes.error) throw new Error(profileRes.error)

      setHandleExists(true)
      setSuccess('Profile saved.')
    } catch (err: any) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || initialLoad) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Edit Profile</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading profile…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Edit Profile</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-hs-soft flex items-center justify-center mx-auto mb-5">
            <ProfileIcon size={32} className="text-hs-gold" />
          </div>
          <h1 className="text-2xl font-bold text-hs-cream mb-2">Sign in first</h1>
          <p className="text-hs-gray text-sm mb-6">You need an account to claim a handle.</p>
          <Link href="/auth?next=/account/profile" className="inline-block px-8 py-3.5 bg-hs-gold text-hs-black rounded-full font-bold text-sm">Sign In</Link>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <Link href="/account" className="flex h-10 w-10 items-center justify-center rounded-full text-hs-gray hover:bg-hs-soft hover:text-hs-cream transition">
            <ArrowLeft size={20} />
          </Link>
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">Edit Profile</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4 flex gap-3">
            <AlertCircle size={18} className="text-hs-red shrink-0" />
            <p className="text-sm text-hs-red">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-hs-success/30 bg-hs-success/10 p-4 flex gap-3">
            <CheckCircle2 size={18} className="text-hs-success shrink-0" />
            <p className="text-sm text-hs-success">{success}</p>
          </div>
        )}

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">@handle *</label>
          <div className="relative">
            <AtSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-hs-gray" />
            <input
              value={handle}
              onChange={(e) => { setHandle(e.target.value); if (error) validateHandle(e.target.value) }}
              placeholder="yourname"
              className="w-full pl-11 pr-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
          <p className="text-xs text-hs-gray mt-2">This becomes your public profile URL: hungerswipes.com/{normalizeHandle(handle) || 'yourhandle'}</p>
        </section>

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people what you cook, eat, or love."
            rows={4}
            maxLength={280}
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition resize-none"
          />
          <p className="text-xs text-hs-gray mt-1 text-right">{bio.length}/280</p>
        </section>

        <section className="space-y-4">
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider block">Links</label>
          <div className="relative">
            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-hs-gray" />
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Website URL"
              className="w-full pl-11 pr-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hs-gold text-sm font-bold">@</span>
            <input
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="Instagram handle"
              className="w-full pl-11 pr-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hs-gold text-sm font-bold">TT</span>
            <input
              value={tiktokHandle}
              onChange={(e) => setTiktokHandle(e.target.value)}
              placeholder="TikTok handle"
              className="w-full pl-11 pr-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hs-gold text-sm font-bold">▶</span>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="YouTube channel URL"
              className="w-full pl-11 pr-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
        </section>

        <div className="flex gap-3 pt-4">
          <Link href="/account" className="min-h-12 px-5 py-3 border border-white/[0.08] bg-hs-charcoal text-hs-cream rounded-2xl font-semibold inline-flex items-center gap-2 hover:bg-hs-soft transition">
            <ArrowLeft size={18} /> Back
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 min-h-12 py-3 bg-hs-gold text-hs-black rounded-2xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-hs-gold-light transition"
          >
            {saving ? 'Saving…' : <><CheckCircle2 size={18} /> Save Profile</>}
          </button>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
