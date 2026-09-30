'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Clock3, Trash2, History } from 'lucide-react'
import { BrandMark, WantItIcon, GetItIcon, LocationIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import PlaceActions from '@/app/components/PlaceActions'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ErrorState } from '@/app/components/ui/ErrorState'
import { DishImage } from '@/app/components/DishImage'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'
import { formatOptionalFoodPrice } from '@/lib/food'
import Head from 'next/head'

interface SavedItem {
  id: string
  content_kind: 'official' | 'community'
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

export default function SavedPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/auth?next=/saved')
      return
    }
    loadSaved()
  }, [authLoading, user?.id, router])

  const loadSaved = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/saves')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Saved dishes unavailable')
      setSaved(data.saved || [])
    } catch (e) {
      console.error(e)
      setError('Couldn’t load your saved dishes.')
    }
    setLoading(false)
  }

  const removeSaved = async (dishId: string, contentKind: SavedItem['content_kind']) => {
    if (removing) return
    setRemoving(dishId)
    setError('')
    try {
      const response = await authFetch(`/api/saves?contentKind=${contentKind}&contentId=${encodeURIComponent(dishId)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Remove failed')
      setSaved((items) => items.filter((item) => item.dish.id !== dishId || item.content_kind !== contentKind))
    } catch {
      setError('Couldn’t remove that dish. Nothing changed; please retry.')
    } finally {
      setRemoving(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandMark size={28} />
              <span className="font-bold text-base text-hs-cream tracking-tight">Saved</span>
            </div>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your saved dishes…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>Saved Dishes — Hunger Swipes</title>
        <meta name="description" content="Food you want, saved from Hunger Swipes." />
      </Head>
      <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Saved</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className="flex items-center gap-1 text-hs-gold text-sm font-semibold hover:text-hs-gold-light transition"
            >
              <History size={16} aria-hidden="true" /> History
            </Link>
            <Link
              href="/swipe"
              className="flex items-center gap-1 text-hs-gold text-sm font-semibold hover:text-hs-gold-light transition"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Discover
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
        {error && saved.length === 0 ? (
          <ErrorState title="Saved is unavailable" body={error} action={<button onClick={loadSaved} className="rounded-full bg-hs-gold px-6 py-3 font-bold text-hs-black">Try Again</button>} />
        ) : saved.length === 0 ? (
          <EmptyState
            icon={<WantItIcon size={52} className="text-hs-gold" />}
            title="No saved dishes yet"
            body="Swipe right on food you want. Everything you save shows up here."
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
            <p className="text-hs-gray text-sm mb-4">{saved.length} {saved.length === 1 ? 'dish' : 'dishes'} saved · dishes drop off after 24 hours and move to <Link href="/history" className="text-hs-gold hover:underline">History</Link></p>
            {saved.map((item) => {
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
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        item.content_kind === 'official'
                          ? 'bg-hs-gold text-hs-black'
                          : 'bg-hs-soft/80 text-hs-cream backdrop-blur-sm'
                      }`}>
                        {item.content_kind === 'official' ? 'Official' : 'Community'}
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
                      <IconButton
                        label={`Remove ${dish.name} from saved dishes`}
                        disabled={removing === dish.id}
                        onClick={() => removeSaved(dish.id, item.content_kind)}
                        className="w-11 h-11 rounded-xl bg-hs-soft text-hs-gray hover:text-hs-red hover:bg-hs-red/10 transition"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </IconButton>
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
