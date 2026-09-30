'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, History, Heart, X, Phone, Clock3 } from 'lucide-react'
import { BrandMark, WantItIcon, LocationIcon } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'
import PlaceActions from '@/app/components/PlaceActions'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { DishImage } from '@/app/components/DishImage'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'
import { formatOptionalFoodPrice } from '@/lib/food'
import Head from 'next/head'

interface HistoryItem {
  id: string
  content_kind: 'official' | 'community'
  direction: 'left' | 'right'
  created_at: string
  updated_at: string
  dish: {
    id: string
    name: string
    description: string
    photo_url: string
    price: number | null
    category?: string
    seller: {
      id: string
      business_name: string
      location_text?: string
      phone?: string
      hours_text?: string
      pickup_available?: boolean
      delivery_available?: boolean
      ordering_method?: string
      ordering_url?: string
      address?: string
      city?: string
      state?: string
      latitude?: number
      longitude?: number
      website?: string
      order_url?: string
    }
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [swipes, setSwipes] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/auth?next=/history')
      return
    }
    loadHistory()
  }, [authLoading, user?.id, router])

  const loadHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/swipes')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Swipe history unavailable')
      setSwipes(data.swipes || [])
    } catch (e) {
      console.error(e)
      setError('Couldn’t load your swipe history.')
    }
    setLoading(false)
  }

  const saveAgain = async (dishId: string, contentKind: HistoryItem['content_kind']) => {
    if (saving) return
    setSaving(dishId)
    setError('')
    try {
      const res = await authFetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: dishId, contentKind, direction: 'right' }),
      })
      if (!res.ok) throw new Error('Save failed')
      loadHistory()
    } catch {
      setError('Couldn’t save that dish. Please retry.')
    } finally {
      setSaving(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">History</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your swipe history…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Head>
        <title>Swipe History — Hunger Swipes</title>
        <meta name="description" content="Everything you swiped on Hunger Swipes." />
      </Head>
      <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Swipe History</span>
          </div>
          <Link
            href="/saved"
            className="flex items-center gap-1 text-hs-gold text-sm font-semibold hover:text-hs-gold-light transition"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Saved
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
        {error && swipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-hs-red text-sm mb-4">{error}</p>
            <button onClick={loadHistory} className="rounded-full bg-hs-gold px-6 py-3 font-bold text-hs-black">Try Again</button>
          </div>
        ) : swipes.length === 0 ? (
          <EmptyState
            icon={<WantItIcon size={52} className="text-hs-gold" />}
            title="No swipe history yet"
            body="Everything you swipe — left or right — shows up here, even after you clear your saved list."
            action={
              <Link
                href="/swipe"
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
              >
                Start Discovering
              </Link>
            }
          />
        ) : (
          <div className="space-y-5">
            {error && <p role="alert" className="rounded-xl border border-hs-red/30 bg-hs-red/10 p-3 text-sm text-hs-cream">{error}</p>}
            <p className="text-hs-gray text-sm mb-4">{swipes.length} {swipes.length === 1 ? 'swipe' : 'swipes'} recorded</p>
            {swipes.map((item) => {
              const dish = item.dish
              const seller = dish.seller
              const displayPrice = formatOptionalFoodPrice(dish.price)
              return (
                <article
                  key={item.id}
                  className="bg-hs-charcoal rounded-[1.5rem] overflow-hidden border border-white/[0.06] shadow-card"
                >
                  <div className="relative h-52 sm:h-60 bg-hs-graphite">
                    <DishImage src={dish.photo_url} alt={dish.name} sizes="(max-width: 480px) calc(100vw - 32px), 448px" quality={80} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        item.content_kind === 'official'
                          ? 'bg-hs-gold text-hs-black'
                          : 'bg-hs-soft/80 text-hs-cream backdrop-blur-sm'
                      }`}>
                        {item.content_kind === 'official' ? 'Official' : 'Community'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm ${
                        item.direction === 'right'
                          ? 'bg-hs-success text-hs-black'
                          : 'bg-hs-red text-hs-black'
                      }`}>
                        {item.direction === 'right' ? <Heart size={10} /> : <X size={10} />}
                        {item.direction === 'right' ? 'Liked' : 'Passed'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-hs-cream leading-tight truncate">{dish.name}</h3>
                        <p className="text-sm text-hs-gray mt-0.5">{seller.business_name}</p>
                      </div>
                      {displayPrice && (
                        <p className="text-lg font-black text-hs-gold shrink-0">{displayPrice}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-hs-gray mb-3">
                      {seller.location_text && (
                        <span className="flex items-center gap-1">
                          <LocationIcon size={13} /> {seller.location_text}
                        </span>
                      )}
                      {seller.hours_text && (
                        <span className="flex items-center gap-1">
                          <Clock3 size={13} aria-hidden="true" /> {seller.hours_text}
                        </span>
                      )}
                      {seller.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={13} /> {seller.phone}
                        </span>
                      )}
                    </div>

                    {dish.description && (
                      <p className="text-sm text-hs-gray mb-4 line-clamp-2">{dish.description}</p>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <PlaceActions place={{ ...seller, name: seller.business_name, order_url: seller.order_url || seller.ordering_url }} compact />
                      </div>
                      {item.direction === 'left' && (
                        <button
                          onClick={() => saveAgain(dish.id, item.content_kind)}
                          disabled={saving === dish.id}
                          className="px-4 py-2 rounded-xl bg-hs-gold text-hs-black text-sm font-bold hover:bg-hs-gold-light transition disabled:opacity-50"
                        >
                          {saving === dish.id ? 'Saving…' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
    </>
  )
}
