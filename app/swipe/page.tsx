'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PassIcon, WantItIcon, FilterIcon, BrandMark, ReplayFoodIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import PlaceActions from '@/app/components/PlaceActions'
import { FilterSheet } from '@/app/components/ui/FilterSheet'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ErrorState } from '@/app/components/ui/ErrorState'
import { OfflineState } from '@/app/components/ui/OfflineState'
import { DishImage } from '@/app/components/DishImage'
import FoodVideo from '@/app/components/FoodVideo'
import { useAuth } from '@/lib/auth'
import { authFetch, optionalAuthFetch } from '@/lib/auth-fetch'
import { DEFAULT_DISCOVERY_PREFERENCES, readDiscoveryPreferences, type DiscoveryPreferences } from '@/lib/preferences'
import { committedDirection, isSystemEdgeStart, sampleGesture, type GestureIntent, type SwipeDirection } from '@/lib/swipe-engine'
import { persistSwipe, type SwipeWriteResult } from '@/lib/swipe-persistence'
import { DiscoveryModeSwitch, useStoredDiscoveryMode } from '@/app/components/DiscoveryModeSwitch'
import { RecipeBadge } from '@/app/components/RecipeBadge'
import RecipeUnlockSheet from '@/app/components/RecipeUnlockSheet'
import FollowButton from '@/app/components/FollowButton'


interface FoodDish {
  id: string
  contentKind: 'official' | 'community'
  imageUrl: string
  videoUrl?: string
  posterUrl?: string
  videoDuration?: number
  recipePreview?: { id: string; title: string; description?: string; price: number; photo_url?: string; recipe_type?: 'free' | 'fixed_price' | 'proud_to_pay'; min_proud_to_pay_amount?: number }
  recipeAvailable?: boolean
  restaurant: string
  location: string
  dish: string
  cuisine: string
  cuisineTags?: string[]
  priceRange: string
  price: number | null
  dietaryTags?: string[]
  spiceLevel?: number
  healthCategory?: string
  distanceMiles?: number
  seller: { id: string; business_name: string; location_text?: string; address?: string; city?: string; state?: string; latitude?: number; longitude?: number; phone?: string; website?: string; order_url?: string; ordering_method?: string; ordering_url?: string; owner_user_id?: string }
}

interface TemporaryFilters { cuisine: string; dietary: string; health: string; priceRange: string; spiceLevel: number }
const EMPTY_FILTERS: TemporaryFilters = { cuisine: '', dietary: '', health: '', priceRange: '', spiceLevel: 0 }
const PAGE_SIZE = 20
const REFILL_AT = 5

function priceToRange(price?: number): string {
  if (!price && price !== 0) return '$'
  if (price < 12) return '$'
  if (price < 24) return '$$'
  return '$$$'
}

function shortLocation(dish: FoodDish): string | null {
  const city = dish.seller?.city?.trim()
  if (city) return city
  const parts = (dish.seller?.location_text || '').split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length > 1) return parts[parts.length - 1]
  if (parts.length === 1 && parts[0].length <= 20) return parts[0]
  return null
}

function mapDish(dish: any): FoodDish {
  return {
    id: dish.id,
    contentKind: dish.content_kind || 'official',
    imageUrl: dish.photo_url,
    videoUrl: dish.video_url,
    posterUrl: dish.poster_url,
    videoDuration: dish.video_duration,
    recipePreview: dish.recipe_preview,
    recipeAvailable: !!dish.recipe_available,
    restaurant: dish.seller.business_name,
    location: dish.seller.location_text || '',
    dish: dish.name,
    cuisine: dish.category || '',
    cuisineTags: dish.tags || [],
    priceRange: priceToRange(typeof dish.price === 'number' ? dish.price : undefined),
    price: typeof dish.price === 'number' && dish.price > 0 ? dish.price : null,
    dietaryTags: dish.dietary_tags || [],
    spiceLevel: dish.spice_level,
    healthCategory: dish.health_category,
    distanceMiles: typeof dish.distance_miles === 'number' ? dish.distance_miles : undefined,
    seller: dish.seller,
  }
}

export default function SwipePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [dishes, setDishes] = useState<FoodDish[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [refillError, setRefillError] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TemporaryFilters>(EMPTY_FILTERS)
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(DEFAULT_DISCOVERY_PREFERENCES)
  const [preferencesReady, setPreferencesReady] = useState(false)
  const [feedTab, setFeedTab] = useState<'for-you' | 'nearby' | 'trending'>('for-you')
  const { mode: discoveryMode, setMode: setDiscoveryMode, ready: discoveryModeReady } = useStoredDiscoveryMode('eat')
  const [recipeSheetRecipeId, setRecipeSheetRecipeId] = useState<string | null>(null)
  const [replayMode, setReplayMode] = useState(false)
  const [showReplayToast, setShowReplayToast] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const [locationState, setLocationState] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'>('idle')
  const [radius, setRadius] = useState(15)
  const [online, setOnline] = useState(true)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [lastSwipe, setLastSwipe] = useState<SwipeDirection | null>(null)
  const [actionState, setActionState] = useState<'idle' | 'persisting' | 'exiting' | 'failed'>('idle')
  const [swipeFailure, setSwipeFailure] = useState<SwipeWriteResult | null>(null)
  const [pendingSwipe, setPendingSwipe] = useState<{ dish: FoodDish; direction: SwipeDirection } | null>(null)
  const [matchDish, setMatchDish] = useState<FoodDish | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [continueEarly, setContinueEarly] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const replayToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAdvance = useRef<{ dish: FoodDish; direction: SwipeDirection; saved: boolean } | null>(null)
  const startPoint = useRef({ x: 0, y: 0 })
  const gestureIntent = useRef<GestureIntent>('undecided')
  const activePointer = useRef<number | null>(null)
  const actionLock = useRef(false)
  const seenKeys = useRef(new Set<string>())
  const requestGeneration = useRef(0)

  useEffect(() => {
    const loaded = readDiscoveryPreferences().preferences
    setPreferences(loaded)
    setRadius(loaded.distanceMiles)
    setPreferencesReady(true)
    setOnline(navigator.onLine)
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) }
  }, [])

  const loadSavedCount = useCallback(async () => {
    try {
      const response = await authFetch('/api/saves')
      const data = await response.json()
      setSavedCount(response.ok && Array.isArray(data.saved) ? data.saved.length : 0)
    } catch { setSavedCount(0) }
  }, [])

  const fetchDishes = useCallback(async ({ reset = false, nextFilters = filters, nextMode = feedTab, nextDiscoveryMode = discoveryMode, replay = replayMode }: { reset?: boolean; nextFilters?: TemporaryFilters; nextMode?: typeof feedTab; nextDiscoveryMode?: 'eat' | 'make' | 'explore'; replay?: boolean } = {}) => {
    if (!preferencesReady || authLoading || !discoveryModeReady) return
    if (nextMode === 'nearby' && !coordinates) {
      setLoading(false)
      setShowFilters(true)
      return
    }
    const generation = reset ? ++requestGeneration.current : requestGeneration.current
    if (reset) {
      setLoading(true); setFeedError(null); setRefillError(false); setHasMore(true); seenKeys.current.clear()
    } else {
      if (loadingMore || !hasMore) return
      setLoadingMore(true); setRefillError(false)
    }
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), mode: nextMode, offset: '0', discoveryMode: nextDiscoveryMode })
      if (replay) params.set('replay', 'true')
      const cuisine = nextFilters.cuisine ? [nextFilters.cuisine] : preferences.cuisines
      const dietary = nextFilters.dietary ? [nextFilters.dietary] : preferences.dietary
      const health = nextFilters.health ? [nextFilters.health] : preferences.health
      const prices = nextFilters.priceRange ? [nextFilters.priceRange] : preferences.price
      if (cuisine.length) params.set('cuisineTags', cuisine.join(','))
      if (dietary.length) params.set('dietaryTags', dietary.join(','))
      if (health.length) params.set('healthCategories', health.join(','))
      if (prices.length) params.set('priceRanges', prices.join(','))
      const spice = nextFilters.spiceLevel || preferences.spice
      if (spice > 0) params.set('spiceLevel', String(spice))
      for (const key of seenKeys.current) params.append('exclude', key)
      if (nextMode === 'nearby' && coordinates) {
        params.set('lat', String(coordinates.lat)); params.set('lng', String(coordinates.lng)); params.set('radius', String(radius))
      }
      const response = await optionalAuthFetch(`/api/dishes?${params}`)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || !contentType.includes('application/json')) {
        const text = await response.text().catch(() => '')
        throw new Error(text || 'Dish feed unavailable')
      }
      const data = await response.json()
      if (data.error) throw new Error(data.error || 'Dish feed unavailable')
      if (generation !== requestGeneration.current) return
      const incoming = (data.dishes || []).map(mapDish).filter((dish: FoodDish) => !seenKeys.current.has(`${dish.contentKind}:${dish.id}`))
      for (const dish of incoming) seenKeys.current.add(`${dish.contentKind}:${dish.id}`)
      setDishes((current) => reset ? incoming : [...current, ...incoming])
      if (reset) setCurrentIndex(0)
      setHasMore(Boolean(data.hasMore) && incoming.length > 0)
    } catch (error) {
      console.error('Dishes feed unavailable', error)
      if (reset) { setFeedError('feed-unavailable'); setDishes([]) } else setRefillError(true)
    } finally {
      if (generation === requestGeneration.current) { setLoading(false); setLoadingMore(false) }
    }
  }, [authLoading, coordinates, feedTab, filters, hasMore, loadingMore, preferences, preferencesReady, radius])

  useEffect(() => {
    localStorage.removeItem('hungerswipes_matches')
    if (!preferencesReady || authLoading || !discoveryModeReady) return
    void fetchDishes({ reset: true })
    if (user) void loadSavedCount(); else setSavedCount(0)
  }, [authLoading, user?.id, preferencesReady, discoveryModeReady])

  useEffect(() => {
    if (currentIndex < dishes.length && dishes.length - currentIndex <= REFILL_AT && hasMore && !loadingMore) void fetchDishes()
  }, [currentIndex, dishes.length, hasMore, loadingMore])

  useEffect(() => {
    const dish = dishes[currentIndex]
    if (!dish || !user) return
    void authFetch('/api/impressions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: dish.id, contentKind: dish.contentKind }) })
  }, [currentIndex, dishes, user?.id])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return setLocationState('unavailable')
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => { setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude }); setLocationState('ready') },
      () => setLocationState('denied'),
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    )
  }, [])

  const doAdvance = useCallback(() => {
    const pending = pendingAdvance.current
    if (!pending) { actionLock.current = false; return }
    const { dish, direction, saved } = pending
    if (saved && direction === 'right') {
      setSavedCount((count) => count + 1); setMatchDish(dish); window.setTimeout(() => setMatchDish(null), 1800)
    }
    setAnnouncement(direction === 'right' ? `${dish.dish} saved` : `${dish.dish} passed`)
    setCurrentIndex((index) => index + 1)
    setDragX(0); setGestureProgress(0); setLastSwipe(null); setPendingSwipe(null); setSwipeFailure(null); setActionState('idle'); setContinueEarly(false)
    pendingAdvance.current = null
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    actionLock.current = false
  }, [])

  const finishAdvance = useCallback((dish: FoodDish, direction: SwipeDirection, saved: boolean) => {
    pendingAdvance.current = { dish, direction, saved }
    if (direction === 'right') {
      setContinueEarly(true)
      if (holdTimer.current) clearTimeout(holdTimer.current)
      holdTimer.current = setTimeout(() => doAdvance(), 5000)
    } else {
      doAdvance()
    }
  }, [doAdvance])

  const advanceNow = useCallback(() => {
    doAdvance()
  }, [doAdvance])

  const persistAndAdvance = useCallback(async (dish: FoodDish, direction: SwipeDirection) => {
    setActionState('persisting')
    const result = await persistSwipe(() => authFetch('/api/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: dish.id, contentKind: dish.contentKind, direction }) }))
    if (result.ok) {
      setActionState('exiting'); window.setTimeout(() => finishAdvance(dish, direction, result.saved), 350); return
    }
    setActionState('failed'); setSwipeFailure(result); setDragX(0); setGestureProgress(0); setLastSwipe(null); actionLock.current = false
  }, [finishAdvance])

  const commitSwipe = useCallback((direction: SwipeDirection) => {
    const dish = dishes[currentIndex]
    if (!dish || actionLock.current) return
    if (!user && direction === 'right') {
      // Keep the card exit visually consistent with the button/gesture path before
      // sending an unauthenticated user to sign up.
      actionLock.current = true
      setPendingSwipe({ dish, direction }); setSwipeFailure(null); setLastSwipe(direction); setActionState('exiting')
      setDragX(Math.max(window.innerWidth, 480))
      window.setTimeout(() => router.push('/auth?mode=signup&next=/swipe'), 350)
      return
    }
    actionLock.current = true
    setPendingSwipe({ dish, direction }); setSwipeFailure(null); setLastSwipe(direction); setActionState('exiting')
    setDragX((direction === 'right' ? 1 : -1) * Math.max(window.innerWidth, 480))
    if (!user) { window.setTimeout(() => finishAdvance(dish, direction, false), 350); return }
    void persistAndAdvance(dish, direction)
  }, [currentIndex, dishes, finishAdvance, persistAndAdvance, router, user])

  const retrySwipe = useCallback(() => {
    if (!pendingSwipe || actionLock.current) return
    actionLock.current = true; setSwipeFailure(null); setLastSwipe(pendingSwipe.direction)
    setDragX((pendingSwipe.direction === 'right' ? 1 : -1) * Math.max(window.innerWidth, 480))
    void persistAndAdvance(pendingSwipe.dish, pendingSwipe.direction)
  }, [pendingSwipe, persistAndAdvance])

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (actionLock.current || event.button !== 0 || (event.target as HTMLElement).closest('button,a')) return
    if (isSystemEdgeStart(event.clientX, window.innerWidth)) return
    activePointer.current = event.pointerId; startPoint.current = { x: event.clientX, y: event.clientY }; gestureIntent.current = 'undecided'; setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (activePointer.current !== event.pointerId || !isDragging) return
    const sample = sampleGesture(startPoint.current, { x: event.clientX, y: event.clientY }, gestureIntent.current, window.innerWidth)
    gestureIntent.current = sample.intent
    if (sample.intent === 'horizontal') event.preventDefault()
    setDragX(sample.displayX); setGestureProgress(sample.progress)
  }
  const finishPointer = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    if (activePointer.current !== event.pointerId) return
    const sample = sampleGesture(startPoint.current, { x: event.clientX, y: event.clientY }, gestureIntent.current, window.innerWidth)
    activePointer.current = null; setIsDragging(false); gestureIntent.current = 'undecided'
    const direction = cancelled ? null : committedDirection(sample, window.innerWidth)
    if (direction) commitSwipe(direction); else { setDragX(0); setGestureProgress(0) }
  }

  const applyFilters = () => { setShowFilters(false); void fetchDishes({ reset: true, nextFilters: filters, nextMode: feedTab, nextDiscoveryMode: discoveryMode }) }
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setFeedTab('for-you')
    setReplayMode(false)
    setShowFilters(false)
    void fetchDishes({ reset: true, nextFilters: EMPTY_FILTERS, nextMode: 'for-you', nextDiscoveryMode: discoveryMode })
  }
  const changeMode = (mode: typeof feedTab) => { setFeedTab(mode); if (mode === 'nearby' && !coordinates && locationState === 'idle') requestLocation() }
  const onDiscoveryModeChange = (mode: 'eat' | 'make' | 'explore') => {
    setDiscoveryMode(mode)
    setReplayMode(false)
    void fetchDishes({ reset: true, nextDiscoveryMode: mode })
  }
  const enableReplay = () => {
    setReplayMode(true)
    setCurrentIndex(0)
    seenKeys.current.clear()
    setShowReplayToast(true)
    if (replayToastTimer.current) clearTimeout(replayToastTimer.current)
    replayToastTimer.current = setTimeout(() => setShowReplayToast(false), 3000)
    void fetchDishes({ reset: true, replay: true })
  }
  const currentDish = dishes[currentIndex]
  const nextDish = dishes[currentIndex + 1]
  const locationLabel = currentDish ? shortLocation(currentDish) : null
  const rotation = Math.max(-10, Math.min(10, dragX * 0.025))

  const BrandHeader = () => <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-2 safe-top"><div className="max-w-md mx-auto flex items-center justify-between"><Link href="/swipe" className="flex items-center gap-2 min-w-0 overflow-hidden"><BrandMark size={30} className="shrink-0" /><span className="font-bold text-base text-hs-cream tracking-tight whitespace-nowrap truncate block max-w-[170px] sm:max-w-none">Hunger Swipes</span></Link>{!user && <Link href="/auth" className="shrink-0 ml-3 text-sm font-semibold text-hs-gold hover:text-hs-gold-light transition whitespace-nowrap">Sign in</Link>}</div></header>

  const DiscoverShell = ({ children, includeModeSwitch = true }: { children: React.ReactNode; includeModeSwitch?: boolean }) => (
    <div className="min-h-screen bg-hs-ink flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex flex-col px-4 pt-3 pb-20 max-w-md mx-auto w-full">
        <h1 className="text-hs-cream text-xl font-black tracking-tight mb-1">Discover food near you</h1>
        <p className="text-hs-gray text-xs mb-3">Swipe through real dishes from local food businesses and community food posts. Save what you want, pass on the rest.</p>
        {includeModeSwitch && <DiscoveryModeSwitch value={discoveryMode} onChange={onDiscoveryModeChange} />}
        <div className="flex flex-wrap gap-2 mb-3">
          <Link href="/nearby" className="px-3 py-1.5 rounded-full bg-hs-soft text-hs-cream text-xs font-semibold hover:bg-hs-gold hover:text-hs-black transition">Nearby</Link>
          <Link href="/saved" className="px-3 py-1.5 rounded-full bg-hs-soft text-hs-cream text-xs font-semibold hover:bg-hs-gold hover:text-hs-black transition">Saved</Link>
          <Link href="/join" className="px-3 py-1.5 rounded-full bg-hs-gold text-hs-black text-xs font-bold hover:bg-hs-gold-light transition">List Your Food</Link>
        </div>
        {children}
      </main>
      <MobileNav />
    </div>
  )

  if (loading && dishes.length === 0) return (
    <DiscoverShell>
      <div className="flex-1 flex flex-col items-center justify-center text-hs-gray text-sm" aria-busy="true">
        <BrandMark size={48} className="text-hs-gold mb-4 animate-pulse" />
        <p>Finding great food near you…</p>
      </div>
    </DiscoverShell>
  )
  if (feedError) return (
    <DiscoverShell>
      <div className="flex-1 flex flex-col justify-center">
        <ErrorState title="Couldn’t load dishes" body="Something went wrong while fetching food. Check your connection and try again." action={<button onClick={() => fetchDishes({ reset: true })} className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm">Try Again</button>} />
      </div>
    </DiscoverShell>
  )
  if (!online && dishes.length === 0) return <div className="min-h-screen bg-hs-ink flex flex-col"><BrandHeader /><main className="flex-1"><OfflineState /></main><MobileNav /></div>
  if (dishes.length === 0) return <DiscoverShell includeModeSwitch>
    <div className="flex-1 flex flex-col justify-center">
      <EmptyState
        icon={<BrandMark size={56} />}
        title={replayMode ? 'Nothing to replay in this mode' : 'No dishes match'}
        body={replayMode ? 'This mode has no dishes to replay right now.' : 'Adjust your filters or check back when more food is published.'}
        action={
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setFilters(EMPTY_FILTERS); void fetchDishes({ reset: true, nextFilters: EMPTY_FILTERS }) }}
              className="px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm"
            >
              Clear Filters
            </button>
            {replayMode && (
              <button
                onClick={() => { setReplayMode(false); setCurrentIndex(0); void fetchDishes({ reset: true }) }}
                className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm"
              >
                Back to Fresh Feed
              </button>
            )}
            <Link href="/join" className="px-6 py-3 bg-hs-gold/10 text-hs-gold border border-hs-gold/30 rounded-full font-semibold text-sm">List Your Food</Link>
          </div>
        }
      />
    </div>
  </DiscoverShell>
  if (!currentDish) return <DiscoverShell includeModeSwitch>
    <div className="flex-1 flex flex-col justify-center">
      <EmptyState
        icon={<WantItIcon size={48} className="text-hs-gold" />}
        title={replayMode ? 'Replayed everything' : 'You’re all caught up'}
        body={refillError ? 'More dishes could not be loaded.' : replayMode ? 'You’ve cycled through everything available for replay.' : 'You’ve seen everything available for these filters.'}
        action={
          <div className="flex flex-col gap-3">
            {refillError && <button onClick={() => fetchDishes()} className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm">Retry</button>}
            {!replayMode && (
              <button
                onClick={enableReplay}
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                <ReplayFoodIcon size={18} /> Replay Food
              </button>
            )}
            {replayMode && (
              <button
                onClick={() => { setReplayMode(false); setCurrentIndex(0); void fetchDishes({ reset: true }) }}
                className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm"
              >
                Back to Fresh Feed
              </button>
            )}
            <Link href="/saved" className="px-8 py-3 bg-hs-gold/10 text-hs-gold border border-hs-gold/30 rounded-full font-bold text-sm">View Saved ({savedCount})</Link>
          </div>
        }
      />
    </div>
  </DiscoverShell>

  return (
    <div className="h-[100dvh] bg-hs-ink flex flex-col overflow-hidden">
      <BrandHeader />
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-2 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        <DiscoveryModeSwitch value={discoveryMode} onChange={onDiscoveryModeChange} />
        <div className="flex items-center justify-between mb-1 shrink-0"><div className="flex items-center gap-2 text-hs-gray text-xs font-medium min-w-0"><span className="capitalize whitespace-nowrap">{feedTab.replace('-', ' ')}</span>{feedTab === 'nearby' && currentDish.distanceMiles != null && <span className="text-hs-gold">• {currentDish.distanceMiles} mi</span>}{loadingMore && <span aria-live="polite">• loading more</span>}</div><button onClick={() => setShowFilters(true)} className={`flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 rounded-full text-[11px] font-semibold transition border ${filters.cuisine || filters.dietary || filters.health || filters.priceRange ? 'bg-hs-gold text-hs-black border-hs-gold' : 'bg-hs-soft/60 text-hs-cream border-transparent hover:border-hs-gold/30'}`} aria-label="Filters"><FilterIcon size={12} /><span className="hidden sm:inline ml-1">Filters</span></button></div>
        {!online && <div role="status" className="mb-2 rounded-xl bg-hs-red/10 px-3 py-2 text-center text-xs text-hs-red">Offline — authenticated choices stay on the card until saved.</div>}
        {swipeFailure && <div role="alert" className="mb-2 flex items-center gap-2 rounded-xl border border-hs-red/30 bg-hs-red/10 px-3 py-2 text-xs text-hs-cream"><span className="flex-1">{swipeFailure.message}</span>{swipeFailure.retryable ? <button onClick={retrySwipe} className="min-h-9 rounded-lg bg-hs-gold px-3 font-bold text-hs-black">Retry</button> : swipeFailure.kind === 'auth' ? <Link href="/auth?next=/swipe" className="font-bold text-hs-gold">Sign in</Link> : <button onClick={() => { setSwipeFailure(null); setPendingSwipe(null); setActionState('idle') }} className="font-bold text-hs-gold">Dismiss</button>}</div>}
        <div className="relative flex-1 min-h-0 w-full mx-auto">
          {nextDish && <div key={`preview-${nextDish.id}`} className="absolute inset-x-[2%] top-[1%] bottom-[2%] rounded-[1.5rem] overflow-hidden bg-hs-graphite shadow-card scale-[0.97] opacity-40">{nextDish.videoUrl ? <FoodVideo src={nextDish.videoUrl} poster={nextDish.posterUrl || nextDish.imageUrl} className="w-full h-full" /> : <DishImage src={nextDish.imageUrl} alt="" sizes="(max-width: 480px) 92vw, 430px" quality={72} className="w-full h-full object-cover dish-image" />}</div>}
          <article key={`current-${currentDish.id}`} className={`absolute inset-0 rounded-[1.5rem] overflow-hidden shadow-card-lg bg-hs-graphite select-none outline-none focus-visible:ring-2 focus-visible:ring-hs-gold ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ transform: `translate3d(${dragX}px, 0, 0) rotate(${rotation}deg)`, transitionProperty: isDragging ? 'none' : 'transform, opacity', transitionDuration: '300ms', touchAction: 'pan-y' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(event) => finishPointer(event)} onPointerCancel={(event) => finishPointer(event, true)} onKeyDown={(event) => { if (event.key === 'ArrowLeft') commitSwipe('left'); if (event.key === 'ArrowRight') commitSwipe('right') }} tabIndex={0} aria-label={`${currentDish.dish} from ${currentDish.restaurant}. Use left arrow to pass or right arrow to want.`} aria-busy={actionState === 'persisting'} data-testid="swipe-card">
            {currentDish.videoUrl ? (
              <FoodVideo src={currentDish.videoUrl} poster={currentDish.posterUrl || currentDish.imageUrl} className="w-full h-full" preload autoPlay />
            ) : (
              <DishImage src={currentDish.imageUrl} alt={currentDish.dish} sizes="(max-width: 480px) calc(100vw - 32px), 448px" preload quality={84} className="w-full h-full object-cover dish-image" />
            )}

            {dragX > 0 && <div className="absolute top-5 left-5 border-[3px] border-hs-gold text-hs-gold px-3 py-1.5 rounded-xl font-black text-base tracking-tight rotate-[-12deg] bg-hs-black/35 backdrop-blur-sm" style={{ opacity: gestureProgress }}>WANT IT</div>}
            {dragX < 0 && <div className="absolute top-5 right-5 border-[3px] border-hs-red text-hs-red px-3 py-1.5 rounded-xl font-black text-base tracking-tight rotate-[12deg] bg-hs-black/35 backdrop-blur-sm" style={{ opacity: gestureProgress }}>PASS</div>}
            {lastSwipe === 'right' && (
              <div className="absolute inset-0 bg-hs-gold/20 flex flex-col items-center justify-center gap-4">
                <div className="bg-hs-gold text-hs-black text-2xl font-black px-5 py-2.5 rounded-2xl rotate-[-12deg] shadow-gold flex items-center gap-2">
                  Saved ♥️
                </div>
                {continueEarly && (
                  <button
                    onClick={advanceNow}
                    className="mt-4 px-5 py-2.5 bg-hs-black/70 text-white border border-white/20 rounded-full font-bold text-sm backdrop-blur-sm hover:bg-hs-black"
                  >
                    Continue →
                  </button>
                )}
              </div>
            )}
            {lastSwipe === 'left' && <div className="absolute inset-0 bg-hs-red/20 flex items-center justify-center"><div className="bg-hs-red text-white text-2xl font-black px-5 py-2.5 rounded-2xl rotate-[12deg] shadow-lg">PASS</div></div>}
            {currentDish.contentKind === 'community' && <div className="absolute top-3 left-3"><span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-black/30 text-white/75 backdrop-blur-sm border border-white/10">Community</span></div>}
            {currentDish.recipePreview && (
              <button
                onClick={() => setRecipeSheetRecipeId(currentDish.recipePreview!.id)}
                className="absolute top-3 right-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-hs-gold rounded-full"
                aria-label={`Unlock recipe: ${currentDish.recipePreview.title}`}
              >
                <RecipeBadge recipeAvailable={currentDish.recipeAvailable} type={currentDish.recipePreview.recipe_type} price={currentDish.recipePreview.price} />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-4 pt-12 pb-4">
              <div className="mb-2">
                <h2 className="text-white text-[1.35rem] sm:text-[1.55rem] font-black leading-[1.1] tracking-tight mb-0.5 drop-shadow-lg">{currentDish.dish}</h2>
                <p className="text-white/85 text-sm font-medium drop-shadow-md">{currentDish.restaurant}</p>
                <p className="flex items-center gap-2 mt-1 text-white/60 text-xs font-medium">{locationLabel && <span className="truncate max-w-[140px] sm:max-w-[180px]">{locationLabel}</span>}{locationLabel && currentDish.priceRange && <span className="text-white/30">•</span>}{currentDish.priceRange && <span className="text-hs-gold">{currentDish.priceRange}</span>}</p>
              </div>
              <div className="flex items-center justify-between gap-3 mb-3">
                {currentDish.seller?.id && user?.id && currentDish.seller?.owner_user_id !== user.id && (
                  <FollowButton followingType={currentDish.contentKind === 'community' ? 'user' : 'seller'} followingId={currentDish.seller.id} variant="compact" />
                )}
              </div>
              <div className="flex items-center justify-center gap-5">{continueEarly ? (
  <button
    onClick={advanceNow}
    className="px-5 py-2.5 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
  >
    Continue / Next →
  </button>
) : (
  <>
    <IconButton label={`Pass on ${currentDish.dish}`} disabled={actionLock.current} onClick={() => commitSwipe('left')} className="w-14 h-14 sm:w-16 sm:h-16 bg-hs-red/10 border-2 border-hs-red text-hs-red shadow-lg backdrop-blur-sm hover:scale-105 hover:bg-hs-red hover:text-white transition active:scale-95"><PassIcon size={24} className="sm:w-7 sm:h-7" /></IconButton>
    <IconButton label={`Want ${currentDish.dish}`} disabled={actionLock.current} onClick={() => commitSwipe('right')} className="w-16 h-16 sm:w-[72px] sm:h-[72px] bg-hs-gold text-hs-black shadow-gold hover:scale-105 hover:bg-hs-gold-light transition active:scale-95"><WantItIcon size={30} className="sm:w-8 sm:h-8" /></IconButton>
  </>
)}</div></div>
          </article>
        </div>
      </main>
      <div aria-live="polite" className="sr-only">{announcement}</div>
      {recipeSheetRecipeId && currentDish?.recipePreview && (
        <RecipeUnlockSheet
          recipeId={recipeSheetRecipeId}
          dishId={currentDish.id}
          sellerId={currentDish.seller?.id}
          onClose={() => setRecipeSheetRecipeId(null)}
        />
      )}
      {showReplayToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-hs-gold text-hs-black text-sm font-bold shadow-lg">
          Replaying food you’ve seen
        </div>
      )}
      {matchDish && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" role="status"><div className="bg-hs-charcoal rounded-[2rem] p-6 text-center border border-white/[0.08] shadow-card-lg w-full max-w-sm animate-bounce"><div className="w-16 h-16 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-4 text-hs-gold"><WantItIcon size={40} /></div><h2 className="text-2xl font-black text-hs-cream mb-1">Saved</h2><p className="text-hs-gray text-sm mb-4">Added to your saved dishes.</p><p className="text-lg font-bold text-hs-cream">{matchDish.dish}</p><p className="text-hs-gray text-sm mb-5">{matchDish.restaurant}</p><div className="flex justify-center"><PlaceActions place={{ ...matchDish.seller, name: matchDish.seller.business_name, order_url: matchDish.seller.order_url || matchDish.seller.ordering_url }} /></div></div></div>}
      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onChange={setFilters} onApply={applyFilters} onClear={clearFilters} mode={feedTab} onModeChange={changeMode} radius={radius} onRadiusChange={setRadius} locationState={locationState} onRequestLocation={requestLocation} />
      <MobileNav />
    </div>
  )
}
