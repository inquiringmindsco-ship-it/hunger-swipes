'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PassIcon, WantItIcon, FilterIcon, BrandMark } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import PlaceActions from '@/app/components/PlaceActions'
import { FilterSheet } from '@/app/components/ui/FilterSheet'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ErrorState } from '@/app/components/ui/ErrorState'
import { ImageFallback } from '@/app/components/ui/ImageFallback'
import { useAuth } from '@/lib/auth'
import { authFetch, optionalAuthFetch } from '@/lib/auth-fetch'

interface FoodDish {
  id: string
  contentKind: 'official' | 'community'
  imageUrl: string
  restaurant: string
  location: string
  dish: string
  cuisine: string
  cuisineTags?: string[]
  priceRange: string
  price: number | null
  hungerScore?: number
  title?: string
  description?: string
  tags?: string[]
  dietaryTags?: string[]
  calories?: number
  proteinGrams?: number
  carbsGrams?: number
  fatGrams?: number
  spiceLevel?: number
  portionSize?: string
  vegetarianOption?: boolean
  veganOption?: boolean
  glutenFreeOption?: boolean
  healthCategory?: string
  completenessScore?: number
  metadataQualityStatus?: string
  seller: { id: string; business_name: string; location_text?: string; address?: string; city?: string; state?: string; latitude?: number; longitude?: number; phone?: string; website?: string; order_url?: string; ordering_method?: string; ordering_url?: string }
}

function priceToRange(price?: number): string {
  if (!price && price !== 0) return '$'
  if (price < 12) return '$'
  if (price < 24) return '$$'
  return '$$$'
}

function shortLocation(dish: FoodDish): string | null {
  const city = dish.seller?.city?.trim()
  if (city) return city

  const raw = dish.seller?.location_text || ''
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length > 1) {
    // last segment is typically city/state
    return parts[parts.length - 1]
  }
  if (parts.length === 1 && parts[0].length <= 20) return parts[0]
  return null
}

export default function SwipePage() {
  const router = useRouter()
  const [dishes, setDishes] = useState<FoodDish[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastSwipe, setLastSwipe] = useState<'left' | 'right' | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [showMatch, setShowMatch] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    cuisine: '',
    dietary: '',
    health: '',
    priceRange: '',
    spiceLevel: 0,
  })
  const [feedTab, setFeedTab] = useState<'for-you' | 'nearby' | 'trending'>('for-you')
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    localStorage.removeItem('hungerswipes_matches')
    if (authLoading) return
    fetchDishes()
    if (user) loadSavedCount()
    else setSavedCount(0)
  }, [authLoading, user?.id])

  const mapDish = (d: any): FoodDish => ({
    id: d.id,
    contentKind: d.content_kind || 'official',
    imageUrl: d.photo_url,
    restaurant: d.seller.business_name,
    location: d.seller.location_text || '',
    dish: d.name,
    cuisine: d.category || '',
    cuisineTags: d.tags || [],
    priceRange: priceToRange(typeof d.price === 'number' ? d.price : undefined),
    price: typeof d.price === 'number' && d.price > 0 ? d.price : null,
    hungerScore: d.impressions > 0 ? Math.round((d.right_swipes / d.impressions) * 100) : undefined,
    title: d.name,
    description: d.description,
    tags: d.tags || [],
    dietaryTags: d.dietary_tags || [],
    calories: d.calories,
    proteinGrams: d.protein_grams,
    carbsGrams: d.carbs_grams,
    fatGrams: d.fat_grams,
    spiceLevel: d.spice_level,
    portionSize: d.portion_size,
    vegetarianOption: d.vegetarian_option,
    veganOption: d.vegan_option,
    glutenFreeOption: d.gluten_free_option,
    healthCategory: d.health_category,
    completenessScore: d.completeness_score,
    metadataQualityStatus: d.metadata_quality_status,
    seller: d.seller,
  })

  const fetchDishes = async (nextFilters = filters, nextMode = feedTab) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('mode', nextMode)
      if (nextFilters.cuisine) params.set('cuisineTag', nextFilters.cuisine)
      if (nextFilters.dietary) params.set('dietaryTag', nextFilters.dietary)
      if (nextFilters.health) params.set('healthCategory', nextFilters.health)
      if (nextFilters.priceRange) params.set('priceRange', nextFilters.priceRange)

      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await optionalAuthFetch(`/api/dishes${query}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Dish feed unavailable')
      setDishes((data.dishes || []).map(mapDish))
      setCurrentIndex(0)
    } catch (err) {
      console.error('Dishes feed unavailable', err)
      setError('feed-unavailable')
      setDishes([])
    } finally {
      setLoading(false)
    }
  }

  const loadSavedCount = async () => {
    try {
      const res = await authFetch('/api/saves')
      const data = await res.json()
      setSavedCount(res.ok && Array.isArray(data.saved) ? data.saved.length : 0)
    } catch {
      setSavedCount(0)
    }
  }

  const applyFilters = () => {
    setShowFilters(false)
    fetchDishes(filters, feedTab)
  }

  const recordSwipe = async (dish: FoodDish, direction: 'left' | 'right') => {
    try {
      const res = await authFetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: dish.id,
            contentKind: dish.contentKind,
            direction,
          })
      })
      return res.ok
    } catch (err) {
      console.error('Swipe recording failed', err)
      return false
    }
  }

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (!dishes[currentIndex]) return
    if (!user && direction === 'right') {
      router.push('/auth?mode=signup&next=/swipe')
      return
    }

    const currentDish = dishes[currentIndex]
    setLastSwipe(direction)

    if (user) {
      void recordSwipe(currentDish, direction).then((saved) => {
        if (saved && direction === 'right') {
          setSavedCount((count) => count + 1)
          setShowMatch(true)
          setTimeout(() => setShowMatch(false), 1500)
        }
      })
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setLastSwipe(null)
      setDragOffset({ x: 0, y: 0 })
    }, 300)
  }, [currentIndex, dishes, user, router])

  useEffect(() => {
    const dish = dishes[currentIndex]
    if (!dish || !user) return
    void authFetch('/api/impressions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: dish.id, contentKind: dish.contentKind }),
    })
  }, [currentIndex, dishes, user?.id])

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX
      const currentY = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY
      setDragOffset({
        x: currentX - startX,
        y: currentY - startY
      })
    }

    const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
      setIsDragging(false)
      const deltaX = 'changedTouches' in endEvent
        ? endEvent.changedTouches[0].clientX - startX
        : (endEvent as MouseEvent).clientX - startX

      if (Math.abs(deltaX) > 80) {
        handleSwipe(deltaX > 0 ? 'right' : 'left')
      } else {
        setDragOffset({ x: 0, y: 0 })
      }

      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)
  }

  const getCardStyle = () => {
    const rotation = dragOffset.x * 0.04
    return {
      transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y * 0.3}px) rotate(${rotation}deg)`,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }

  // Header component reused across states
  const BrandHeader = () => (
    <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Link href="/swipe" className="flex items-center gap-2 min-w-0 overflow-hidden">
          <BrandMark size={34} className="shrink-0" />
          <span className="font-bold text-base text-hs-cream tracking-tight whitespace-nowrap truncate block max-w-[170px] sm:max-w-none">Hunger Swipes</span>
        </Link>
        {!user && (
          <Link
            href="/auth"
            className="shrink-0 ml-3 text-sm font-semibold text-hs-gold hover:text-hs-gold-light transition whitespace-nowrap"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )

  if (loading && dishes.length === 0) {
    return (
      <div className="min-h-screen bg-hs-ink flex flex-col">
        <BrandHeader />
        <main className="flex-1 flex items-center justify-center">
          <LoadingState label="Finding great food near you…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-hs-ink flex flex-col">
        <BrandHeader />
        <main className="flex-1">
          <ErrorState
            title="Couldn’t load dishes"
            body="Something went wrong while fetching food. Check your connection and try again."
            action={
              <button
                onClick={() => fetchDishes(filters, feedTab)}
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
              >
                Try Again
              </button>
            }
          />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (dishes.length === 0) {
    return (
      <div className="min-h-screen bg-hs-ink flex flex-col">
        <BrandHeader />
        <main className="flex-1">
          <EmptyState
            icon={<BrandMark size={56} />}
            title="No dishes live yet"
            body="Check back soon, or invite a food seller to publish the first dish."
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => fetchDishes(filters, feedTab)}
                  className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm hover:bg-hs-graphite transition"
                >
                  Refresh
                </button>
                <Link
                  href="/join"
                  className="px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
                >
                  List Your Food
                </Link>
              </div>
            }
          />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (currentIndex >= dishes.length) {
    return (
      <div className="min-h-screen bg-hs-ink flex flex-col">
        <BrandHeader />
        <main className="flex-1">
          <EmptyState
            icon={<WantItIcon size={48} className="text-hs-gold" />}
            title="You’re all caught up"
            body="Check back later for more delicious photos."
            action={
              <Link
                href="/saved"
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
              >
                View Saved ({savedCount})
              </Link>
            }
          />
        </main>
        <MobileNav />
      </div>
    )
  }

  const currentDish = dishes[currentIndex]
  const nextDish = dishes[currentIndex + 1]
  const locationLabel = shortLocation(currentDish)

  return (
    <div className="h-[100dvh] bg-hs-ink flex flex-col overflow-hidden">
      <BrandHeader />

      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-2 pb-16">
        {/* Filter context row */}
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-hs-gray text-xs font-medium min-w-0">
            <span className="capitalize whitespace-nowrap">{feedTab.replace('-', ' ')}</span>
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 rounded-full text-[11px] font-semibold transition border ${
              showFilters || filters.cuisine || filters.dietary || filters.health || filters.priceRange
                ? 'bg-hs-gold text-hs-black border-hs-gold'
                : 'bg-hs-soft/60 text-hs-cream border-transparent hover:border-hs-gold/30'
            }`}
            aria-label="Filters"
          >
            <FilterIcon size={12} />
            <span className="hidden sm:inline ml-1">Filters</span>
          </button>
        </div>

        {/* Card Stack — fixed height, one decision object */}
        <div className="relative h-[calc(100dvh-188px)] max-h-[720px] w-full mx-auto shrink-0">
          {nextDish && (
            <div className="absolute inset-x-[2%] top-[2%] bottom-[4%] rounded-[1.75rem] overflow-hidden bg-hs-graphite shadow-card scale-[0.97] opacity-40">
              <img
                src={nextDish.imageUrl}
                alt=""
                className="w-full h-full object-cover dish-image"
              />
            </div>
          )}

          {currentDish && (
            <div
              className="absolute inset-0 rounded-[1.75rem] overflow-hidden shadow-card-lg bg-hs-graphite cursor-grab active:cursor-grabbing select-none"
              style={getCardStyle()}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              role="button"
              aria-label={`${currentDish.dish} from ${currentDish.restaurant}. Swipe right to want, left to pass.`}
            >
              {currentDish.imageUrl ? (
                <img
                  src={currentDish.imageUrl}
                  alt={currentDish.dish}
                  className="w-full h-full object-cover dish-image"
                  draggable={false}
                />
              ) : (
                <ImageFallback label="Dish photo unavailable" className="w-full h-full" />
              )}

              {/* Gesture feedback overlays */}
              {dragOffset.x > 40 && (
                <div className="absolute top-6 left-6 border-[3px] border-hs-gold text-hs-gold px-4 py-2 rounded-2xl font-black text-lg tracking-tight rotate-[-12deg] bg-hs-black/35 backdrop-blur-sm">
                  WANT IT
                </div>
              )}
              {dragOffset.x < -40 && (
                <div className="absolute top-6 right-6 border-[3px] border-hs-red text-hs-red px-4 py-2 rounded-2xl font-black text-lg tracking-tight rotate-[12deg] bg-hs-black/35 backdrop-blur-sm">
                  PASS
                </div>
              )}

              {lastSwipe === 'right' && (
                <div className="absolute inset-0 bg-hs-gold/20 flex items-center justify-center">
                  <div className="bg-hs-gold text-hs-black text-3xl font-black px-6 py-3 rounded-2xl rotate-[-12deg] shadow-gold flex items-center gap-2">
                    <WantItIcon size={32} /> WANT IT
                  </div>
                </div>
              )}
              {lastSwipe === 'left' && (
                <div className="absolute inset-0 bg-hs-red/20 flex items-center justify-center">
                  <div className="bg-hs-red text-white text-3xl font-black px-6 py-3 rounded-2xl rotate-[12deg] shadow-lg">
                    PASS
                  </div>
                </div>
              )}

              {/* Subtle origin provenance */}
              {currentDish.contentKind === 'community' && (
                <div className="absolute top-3 left-3">
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-black/30 text-white/75 backdrop-blur-sm border border-white/10">
                    Community
                  </span>
                </div>
              )}

              {/* Bottom gradient + dish info + primary actions (all inside the card) */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pt-16 pb-5">
                <div className="mb-3">
                  <h2 className="text-white text-[1.55rem] sm:text-[1.85rem] font-black leading-[1.1] tracking-tight mb-1 drop-shadow-lg">
                    {currentDish.dish}
                  </h2>
                  <p className="text-white/85 text-sm sm:text-base font-medium drop-shadow-md">
                    {currentDish.restaurant}
                  </p>
                  <p className="flex items-center gap-2 mt-1 text-white/60 text-xs font-medium">
                    {locationLabel && (
                      <span className="truncate max-w-[140px] sm:max-w-[180px]">{locationLabel}</span>
                    )}
                    {locationLabel && currentDish.priceRange && (
                      <span className="text-white/30">•</span>
                    )}
                    {currentDish.priceRange && (
                      <span className="text-hs-gold">{currentDish.priceRange}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <IconButton
                    label={`Pass on ${currentDish.dish}`}
                    onClick={() => handleSwipe('left')}
                    className="w-16 h-16 sm:w-[72px] sm:h-[72px] bg-hs-red/10 border-2 border-hs-red text-hs-red shadow-lg backdrop-blur-sm hover:scale-105 hover:bg-hs-red hover:text-white transition active:scale-95"
                  >
                    <PassIcon size={26} className="sm:w-[30px] sm:h-[30px]" />
                  </IconButton>
                  <IconButton
                    label={`Want ${currentDish.dish}`}
                    onClick={() => handleSwipe('right')}
                    className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-hs-gold text-hs-black shadow-gold hover:scale-105 hover:bg-hs-gold-light transition active:scale-95"
                  >
                    <WantItIcon size={32} className="sm:w-9 sm:h-9" />
                  </IconButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Match modal */}
      {showMatch && currentDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-hs-charcoal rounded-[2rem] p-6 text-center border border-white/[0.08] shadow-card-lg w-full max-w-sm animate-bounce">
            <div className="w-16 h-16 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-4 text-hs-gold">
              <WantItIcon size={40} />
            </div>
            <h2 className="text-2xl font-black text-hs-cream mb-1">Saved</h2>
            <p className="text-hs-gray text-sm mb-4">Added to your saved dishes.</p>
            <p className="text-lg font-bold text-hs-cream">{currentDish.dish}</p>
            <p className="text-hs-gray text-sm mb-5">{currentDish.restaurant}</p>
            <div className="flex justify-center">
              <PlaceActions place={{ ...currentDish.seller, name: currentDish.seller.business_name, order_url: currentDish.seller.order_url || currentDish.seller.ordering_url }} />
            </div>
          </div>
        </div>
      )}

      <FilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onChange={setFilters}
        onApply={applyFilters}
      />

      <MobileNav />
    </div>
  )
}
