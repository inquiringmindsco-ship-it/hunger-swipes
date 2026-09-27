'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, ExternalLink, MapPin, ChevronLeft, Heart, X, ShoppingBag, Clock, ChefHat, ArrowRight, CheckCircle2 } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ImageFallback } from '@/app/components/ui/ImageFallback'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'

export interface Dish {
  id: string
  name: string
  description?: string | null
  photo_url?: string | null
  price: number
  category?: string | null
  tags?: string[] | null
}

export interface Restaurant {
  id: string
  slug: string
  business_name: string
  tagline?: string | null
  description?: string | null
  logo_url?: string | null
  hero_url?: string | null
  location_text?: string | null
  address?: string | null
  phone?: string | null
  hours_text?: string | null
  ordering_method: string
  ordering_url?: string | null
  website_url?: string | null
  pickup_available: boolean
  delivery_available: boolean
}

function priceToRange(price?: number): string {
  if (!price && price !== 0) return '$'
  if (price < 12) return '$'
  if (price < 24) return '$$'
  return '$$$'
}

export default function RestaurantClient({ restaurant: initialRestaurant, dishes: initialDishes }: { restaurant: Restaurant; dishes: Dish[] }) {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const { user } = useAuth()

  const [restaurant] = useState<Restaurant>(initialRestaurant)
  const [dishes] = useState<Dish[]>(initialDishes)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [showPicks, setShowPicks] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const swipeStartX = useRef<number | null>(null)

  useEffect(() => {
    if (!user || !restaurant?.id) return
    authFetch(`/api/saves?sellerId=${restaurant.id}`)
      .then((res) => res.json())
      .then((data) => {
        const savedDishIds = new Set<string>((data.saved || []).map((s: any) => s.dish_id).filter(Boolean))
        setSaved(savedDishIds)
      })
      .catch(() => {})
  }, [user, restaurant?.id])

  const currentDish = dishes[currentIndex]
  const savedList = useMemo(() => dishes.filter((d) => saved.has(d.id)), [dishes, saved])

  const recordSwipe = async (dish: Dish, direction: 'left' | 'right') => {
    if (direction === 'right') {
      setSaved((prev) => new Set(prev).add(dish.id))
    } else {
      setSaved((prev) => {
        const next = new Set(prev)
        next.delete(dish.id)
        return next
      })
    }
    try {
      await authFetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dish.id, direction, content_kind: 'official' }),
      })
    } catch {
      // best-effort
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentDish) return
    void recordSwipe(currentDish, direction)
    if (currentIndex < dishes.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setShowPicks(true)
    }
  }

  const toggleSaved = (dish: Dish) => {
    const want = !saved.has(dish.id)
    void recordSwipe(dish, want ? 'right' : 'left')
  }

  const orderingText = (r: Restaurant) => {
    switch (r.ordering_method) {
      case 'phone':
        return r.phone ? `Call ${r.phone} to order` : 'Order by phone at the counter'
      case 'link':
        return 'Order online'
      case 'in_app':
        return 'Pay in the app'
      default:
        return 'Order at the counter'
    }
  }

  const orderAction = (r: Restaurant) => {
    if (r.ordering_method === 'phone' && r.phone) {
      window.location.href = `tel:${r.phone.replace(/[^0-9+]/g, '')}`
    } else if (r.ordering_method === 'link' && r.ordering_url) {
      window.open(r.ordering_url, '_blank', 'noopener,noreferrer')
    }
  }

  const orderReady = (restaurant.ordering_method === 'phone' && restaurant.phone)
    || (restaurant.ordering_method === 'link' && restaurant.ordering_url)
  const selectedTotal = savedList.reduce((sum, dish) => sum + Number(dish.price || 0), 0)

  return (
    <div className="min-h-screen bg-hs-ink flex flex-col">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/swipe')} className="flex items-center gap-1 text-hs-gray hover:text-hs-cream transition">
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="font-bold text-sm text-hs-cream tracking-tight">Hunger Swipes</span>
          </div>
          <button
            onClick={() => setShowPicks(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-hs-charcoal border border-white/[0.06] text-hs-gold"
            aria-label="My picks"
          >
            <Heart size={18} fill={saved.size > 0 ? 'currentColor' : 'none'} />
            {saved.size > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-hs-gold text-hs-black text-xs font-bold rounded-full flex items-center justify-center">
                {saved.size}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col">
        <section className="mb-4">
          <div className="flex items-start gap-3">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-hs-charcoal" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-hs-charcoal flex items-center justify-center shrink-0">
                <ChefHat size={28} className="text-hs-gold" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-black text-hs-cream leading-tight truncate">{restaurant.business_name}</h1>
              {restaurant.tagline ? (
                <p className="text-sm text-hs-gold font-medium mt-0.5">{restaurant.tagline}</p>
              ) : restaurant.description ? (
                <p className="text-sm text-hs-gray mt-0.5 line-clamp-2">{restaurant.description}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-hs-gray">
                {restaurant.location_text && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {restaurant.location_text}</span>
                )}
                {restaurant.hours_text && (
                  <span className="flex items-center gap-1"><Clock size={12} /> {restaurant.hours_text}</span>
                )}
                <span className="flex items-center gap-1">
                  {priceToRange(undefined)} {restaurant.pickup_available && '· Pickup'}{restaurant.delivery_available && '· Delivery'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {dishes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-hs-charcoal border border-white/[0.06] flex items-center justify-center mb-5">
              <ChefHat size={36} className="text-hs-gold" />
            </div>
            <h2 className="text-xl font-bold text-hs-cream mb-2">Menu coming soon</h2>
            <p className="text-hs-gray text-sm max-w-[280px] mb-6">
              {restaurant.business_name} is getting their dishes ready. Ask your server for today&apos;s options.
            </p>
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm"
              >
                <Phone size={16} /> Call {restaurant.phone}
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 relative min-h-[420px] max-h-[60vh]">
              {currentDish ? (
                <div
                  className="absolute inset-0 rounded-[1.75rem] overflow-hidden bg-hs-charcoal border border-white/[0.06] shadow-2xl flex flex-col touch-pan-y"
                  onPointerDown={(event) => { swipeStartX.current = event.clientX }}
                  onPointerUp={(event) => {
                    if (swipeStartX.current == null) return
                    const distance = event.clientX - swipeStartX.current
                    swipeStartX.current = null
                    if (Math.abs(distance) > 65) handleSwipe(distance > 0 ? 'right' : 'left')
                  }}
                  tabIndex={0}
                  onKeyDown={(event) => { if (event.key === 'ArrowLeft') handleSwipe('left'); if (event.key === 'ArrowRight') handleSwipe('right') }}
                  aria-label={`${currentDish.name}. Swipe right to want it or left to pass.`}
                >
                  {currentDish.photo_url ? (
                    <img src={currentDish.photo_url} alt={currentDish.name} className="w-full h-[55%] object-cover" />
                  ) : (
                    <div className="w-full h-[55%] bg-hs-graphite flex items-center justify-center">
                      <ImageFallback label={currentDish.name} className="w-24 h-24" />
                    </div>
                  )}
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-xs text-hs-gold font-bold uppercase tracking-wide mb-1">
                          {currentDish.category || 'Featured'} {currentDish.price > 0 && `· $${currentDish.price.toFixed(2)}`}
                        </p>
                        <h2 className="text-2xl font-black text-hs-cream leading-tight">{currentDish.name}</h2>
                      </div>
                      <button
                        onClick={() => toggleSaved(currentDish)}
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center border transition ${saved.has(currentDish.id) ? 'bg-hs-gold border-hs-gold text-hs-black' : 'bg-hs-soft border-white/10 text-hs-gray'}`}
                        aria-label={saved.has(currentDish.id) ? 'Remove from picks' : 'Add to picks'}
                      >
                        <Heart size={22} fill={saved.has(currentDish.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    {currentDish.description && (
                      <p className="text-sm text-hs-gray leading-relaxed line-clamp-3 mb-4">{currentDish.description}</p>
                    )}
                    {currentDish.tags && currentDish.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {currentDish.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="px-2.5 py-1 rounded-full bg-hs-soft text-xs text-hs-silver border border-white/[0.06]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 rounded-[1.75rem] bg-hs-charcoal border border-white/[0.06] flex flex-col items-center justify-center text-center p-6">
                  <CheckCircle2 size={48} className="text-hs-success mb-4" />
                  <h2 className="text-xl font-bold text-hs-cream mb-2">You&apos;ve seen everything</h2>
                  <p className="text-sm text-hs-gray mb-6">Review what you picked below.</p>
                  <button onClick={() => setShowPicks(true)} className="px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm">
                    Review my picks
                  </button>
                </div>
              )}
            </div>

            {currentDish && (
              <div className="flex items-center justify-center gap-6 mt-5 mb-2">
                <button
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 rounded-full bg-hs-charcoal border border-white/[0.06] flex items-center justify-center text-hs-gray hover:text-hs-red hover:border-hs-red/30 transition"
                  aria-label="Pass"
                >
                  <X size={28} />
                </button>
                <button
                  onClick={() => handleSwipe('right')}
                  className="w-20 h-20 rounded-full bg-hs-gold flex items-center justify-center text-hs-black shadow-lg shadow-hs-gold/20 hover:bg-hs-gold-light transition"
                  aria-label="Want it"
                >
                  <Heart size={32} fill="currentColor" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showPicks && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[85vh] bg-hs-ink rounded-t-[1.5rem] sm:rounded-[1.5rem] border border-white/[0.06] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-lg font-black text-hs-cream flex items-center gap-2">
                <ShoppingBag size={20} className="text-hs-gold" /> My picks
              </h2>
              <button onClick={() => { setShowPicks(false); setConfirmed(false) }} className="text-hs-gray hover:text-hs-cream">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-hide">
              {savedList.length === 0 ? (
                <div className="text-center py-8">
                  <Heart size={40} className="text-hs-gray mx-auto mb-3" />
                  <p className="text-hs-gray text-sm">You haven&apos;t picked anything yet. Swipe right on dishes you want.</p>
                </div>
              ) : (
                savedList.map((dish) => (
                  <div key={dish.id} className="flex items-center gap-3 bg-hs-charcoal border border-white/[0.06] rounded-xl p-3">
                    {dish.photo_url ? (
                      <img src={dish.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-hs-graphite flex items-center justify-center shrink-0">
                        <ChefHat size={20} className="text-hs-gold" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-hs-cream truncate">{dish.name}</p>
                      {dish.description && <p className="text-xs text-hs-gray line-clamp-1">{dish.description}</p>}
                      <p className="text-sm text-hs-gold font-semibold mt-0.5">{dish.price > 0 ? `$${dish.price.toFixed(2)}` : 'Price varies'}</p>
                    </div>
                    <button
                      onClick={() => toggleSaved(dish)}
                      className="w-9 h-9 rounded-full bg-hs-soft flex items-center justify-center text-hs-gray hover:text-hs-red"
                      aria-label="Remove"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-5 border-t border-white/[0.06] space-y-3">
              {savedList.length > 0 && <div className="flex items-center justify-between pb-1 text-sm"><span className="text-hs-gray">Estimated subtotal</span><strong className="text-lg text-hs-gold">${selectedTotal.toFixed(2)}</strong></div>}
              {confirmed ? (
                <div className="text-center py-2">
                  <CheckCircle2 size={36} className="text-hs-success mx-auto mb-2" />
                  <p className="text-hs-cream font-bold">Ordering opened</p>
                  <p className="text-xs text-hs-gray mt-1">Complete payment with {restaurant.business_name}&apos;s ordering provider for final confirmation.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { orderAction(restaurant); if (orderReady) setConfirmed(true) }}
                    disabled={savedList.length === 0 || !orderReady}
                    className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition ${savedList.length === 0 || !orderReady ? 'bg-hs-graphite text-hs-muted' : 'bg-hs-gold text-hs-black hover:bg-hs-gold-light'}`}
                  >
                    {restaurant.ordering_method === 'phone' && restaurant.phone ? <Phone size={18} /> : null}
                    {restaurant.ordering_method === 'link' && restaurant.ordering_url ? <ExternalLink size={18} /> : null}
                    {savedList.length === 0 ? 'Pick at least one dish' : !orderReady ? 'Ordering is not configured yet' : `Order ${savedList.length} item${savedList.length === 1 ? '' : 's'}`}
                    {savedList.length > 0 && <ArrowRight size={18} />}
                  </button>
                  <p className="text-center text-xs text-hs-gray">{orderReady ? orderingText(restaurant) : `Ask ${restaurant.business_name} how to place your order.`}</p>
                  <p className="text-center text-[11px] text-hs-muted">Prices are confirmed by the restaurant&apos;s ordering provider.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
