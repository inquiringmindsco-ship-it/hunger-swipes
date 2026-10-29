'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
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
import { hapticSwipe } from '@/lib/haptics'
import { ACCOUNT_DISCOVERY_PREFERENCES_KEY, DEFAULT_DISCOVERY_PREFERENCES, hasActiveDiscoveryPreferences, readAccountDiscoveryPreferences, readDiscoveryPreferences, writeDiscoveryPreferences, type DiscoveryPreferences } from '@/lib/preferences'
import { getSupabase } from '@/lib/supabase'
import { committedDirection, isSystemEdgeStart, sampleGesture, type GestureIntent, type SwipeDirection } from '@/lib/swipe-engine'
import { persistSwipe, type SwipeWriteResult } from '@/lib/swipe-persistence'
import { DiscoveryModeSwitch, useStoredDiscoveryMode } from '@/app/components/DiscoveryModeSwitch'
import { RecipeBadge } from '@/app/components/RecipeBadge'
import RecipeUnlockSheet from '@/app/components/RecipeUnlockSheet'
import FollowButton from '@/app/components/FollowButton'
import TutorialCoachMark, { type TutorialStep } from '@/app/components/TutorialCoachMark'
import ContentSafetyMenu from '@/app/components/ContentSafetyMenu'
import { Clock3, Eye, RotateCcw } from 'lucide-react'


interface FoodDish {
  id: string
  contentKind: 'official' | 'community' | 'place_staging'
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
  seller: { id: string; business_name: string; location_text?: string; address?: string; city?: string; state?: string; latitude?: number; longitude?: number; phone?: string; website?: string; order_url?: string; ordering_method?: string; ordering_url?: string; owner_user_id?: string; hours_text?: string }
  creatorUserId?: string
}

interface TemporaryFilters { cuisine: string; dietary: string; health: string; priceRange: string; spiceLevel: number }
const EMPTY_FILTERS: TemporaryFilters = { cuisine: '', dietary: '', health: '', priceRange: '', spiceLevel: 0 }
const PAGE_SIZE = 20
const REFILL_AT = 5
const MATCH_CONFIRMATION_SECONDS = 15
const DISCOVER_TOUR_KEY = 'hs_discover_tour_v1'
const DISCOVER_TOUR_STEPS: TutorialStep[] = [
  { targetId: 'discover-mode-switch', title: 'Pick your mood', body: 'EAT finds food to order. MAKE finds recipes. EXPLORE finds nearby food spots.', placement: 'below' },
  { targetId: 'discover-swipe-card', title: 'Choose what looks good', body: 'Swipe right when you want it. Sign in to save it. Swipe left to pass.', placement: 'center', dimBackground: true },
  { targetId: 'mobile-nav', title: 'Get around', body: 'Discover, save, post, review your history, sell, or manage your profile.', placement: 'above' },
  { targetId: 'discover-filter-button', title: 'Make it yours', body: 'Narrow food by cuisine, diet, price, distance, and more.', placement: 'below' },
]

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
    creatorUserId: dish.creator_user_id,
  }
}

export default function SwipePage() {
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
  const [feedTab, setFeedTab] = useState<'for-you' | 'nearby' | 'following' | 'trending'>('for-you')
  const { mode: discoveryMode, setMode: setDiscoveryMode, ready: discoveryModeReady } = useStoredDiscoveryMode('eat')
  const [recipeSheetRecipeId, setRecipeSheetRecipeId] = useState<string | null>(null)
  const [replayMode, setReplayMode] = useState(false)
  const [showReplayToast, setShowReplayToast] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const [locationState, setLocationState] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'>('idle')
  const [radius, setRadius] = useState(DEFAULT_DISCOVERY_PREFERENCES.distanceMiles)
  const [online, setOnline] = useState(true)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [gestureProgress, setGestureProgress] = useState(0)
  const [lastSwipe, setLastSwipe] = useState<SwipeDirection | null>(null)
  const [actionState, setActionState] = useState<'idle' | 'persisting' | 'exiting' | 'failed'>('idle')
  const [swipeFailure, setSwipeFailure] = useState<SwipeWriteResult | null>(null)
  const [pendingSwipe, setPendingSwipe] = useState<{ dish: FoodDish; direction: SwipeDirection } | null>(null)
  const [matchDish, setMatchDish] = useState<FoodDish | null>(null)
  const [matchCountdown, setMatchCountdown] = useState(MATCH_CONFIRMATION_SECONDS)
  const [matchPaused, setMatchPaused] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [showDiscoverTour, setShowDiscoverTour] = useState(false)
  const replayToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tourAutoChecked = useRef(false)
  const pendingAdvance = useRef<{ dish: FoodDish; direction: SwipeDirection; saved: boolean } | null>(null)
  const startPoint = useRef({ x: 0, y: 0 })
  const gestureIntent = useRef<GestureIntent>('undecided')
  const activePointer = useRef<number | null>(null)
  const actionLock = useRef(false)
  const seenKeys = useRef(new Set<string>())
  const requestGeneration = useRef(0)

  useEffect(() => {
    if (authLoading) return
    const local = readDiscoveryPreferences()
    const account = readAccountDiscoveryPreferences(user?.user_metadata)
    const loaded = account || local.preferences
    setPreferences(loaded)
    setRadius(loaded.distanceMiles)
    setPreferencesReady(true)
    if (account) writeDiscoveryPreferences(account)
    if (user && !account && local.source !== 'default') {
      void getSupabase()?.auth.updateUser({ data: { [ACCOUNT_DISCOVERY_PREFERENCES_KEY]: local.preferences } })
    }
    setOnline(navigator.onLine)
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) }
  }, [authLoading, user?.id])

  const loadSavedCount = useCallback(async () => {
    try {
      const response = await authFetch('/api/saves')
      const data = await response.json()
      setSavedCount(response.ok && Array.isArray(data.saved) ? data.saved.length : 0)
    } catch { setSavedCount(0) }
  }, [])

  const fetchDishes = useCallback(async ({ reset = false, preserveSeen = false, nextFilters = filters, nextMode = feedTab, nextDiscoveryMode = discoveryMode, nextRadius = radius, replay = replayMode }: { reset?: boolean; preserveSeen?: boolean; nextFilters?: TemporaryFilters; nextMode?: typeof feedTab; nextDiscoveryMode?: 'eat' | 'make' | 'explore'; nextRadius?: number; replay?: boolean } = {}) => {
    if (!preferencesReady || authLoading || !discoveryModeReady) return
    if (nextMode === 'nearby' && !coordinates) {
      setLoading(false)
      setShowFilters(true)
      return
    }
    const generation = reset ? ++requestGeneration.current : requestGeneration.current
    if (reset) {
      setLoading(true); setFeedError(null); setRefillError(false); setHasMore(true)
      if (!preserveSeen) seenKeys.current.clear()
    } else {
      if (loadingMore || !hasMore) return
      setLoadingMore(true); setRefillError(false)
    }
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), mode: nextMode, offset: '0', discoveryMode: nextDiscoveryMode })
      const sellerId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sellerId') : null
      if (sellerId && /^[0-9a-f-]{36}$/i.test(sellerId)) params.set('sellerId', sellerId)
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
        params.set('lat', String(coordinates.lat)); params.set('lng', String(coordinates.lng)); params.set('radius', String(nextRadius))
      }
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10000)
      const response = await optionalAuthFetch(`/api/dishes?${params}`, { signal: controller.signal }).finally(() => window.clearTimeout(timeout))
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
    if (!authLoading && !user && feedTab === 'following') setFeedTab('for-you')
  }, [authLoading, feedTab, user])

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

  useEffect(() => {
    if (!matchDish || matchPaused) return
    if (matchCountdown <= 0) {
      setMatchDish(null)
      return
    }
    const timer = window.setTimeout(() => setMatchCountdown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [matchCountdown, matchDish, matchPaused])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return setLocationState('unavailable')
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => { setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude }); setLocationState('ready') },
      () => setLocationState('denied'),
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    )
  }, [])

  useEffect(() => {
    if (locationState === 'idle') requestLocation()
  }, [locationState, requestLocation])

  useEffect(() => {
    if (!coordinates || feedTab !== 'for-you' || !preferencesReady || authLoading || !discoveryModeReady) return
    setFeedTab('nearby')
    void fetchDishes({ reset: true, nextMode: 'nearby' })
  }, [authLoading, coordinates, discoveryModeReady, feedTab, preferencesReady])

  const doAdvance = useCallback(() => {
    const pending = pendingAdvance.current
    if (!pending) { actionLock.current = false; return }
    const { dish, direction, saved } = pending
    if (direction === 'right' && (saved || !user)) {
      if (saved) setSavedCount((count) => count + 1)
      setMatchCountdown(MATCH_CONFIRMATION_SECONDS)
      setMatchPaused(false)
      setMatchDish(dish)
    }
    setAnnouncement(direction === 'right' ? `${dish.dish} ${saved ? 'saved' : 'previewed'}` : `${dish.dish} passed`)
    setCurrentIndex((index) => index + 1)
    setDragX(0); setGestureProgress(0); setLastSwipe(null); setPendingSwipe(null); setSwipeFailure(null); setActionState('idle')
    pendingAdvance.current = null
    actionLock.current = false
  }, [user])

  const finishAdvance = useCallback((dish: FoodDish, direction: SwipeDirection, saved: boolean) => {
    pendingAdvance.current = { dish, direction, saved }
    doAdvance()
  }, [doAdvance])

  const closeMatch = useCallback(() => {
    setMatchDish(null)
    setMatchPaused(false)
    setMatchCountdown(MATCH_CONFIRMATION_SECONDS)
  }, [])

  const persistAndAdvance = useCallback(async (dish: FoodDish, direction: SwipeDirection) => {
    setActionState('persisting')
    const result = await persistSwipe(() => authFetch('/api/swipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: dish.id, contentKind: dish.contentKind, direction }) }))
    if (result.ok) {
      setActionState('exiting'); window.setTimeout(() => finishAdvance(dish, direction, result.saved), 350); return
    }
    setActionState('failed'); setSwipeFailure(result); setDragX(0); setGestureProgress(0); setLastSwipe(null); actionLock.current = false
  }, [finishAdvance])

  const commitSwipe = useCallback((direction: SwipeDirection) => {
    void hapticSwipe(direction)
    const dish = dishes[currentIndex]
    if (!dish || actionLock.current) return
    actionLock.current = true
    setPendingSwipe({ dish, direction }); setSwipeFailure(null); setLastSwipe(direction); setActionState('exiting')
    setDragX((direction === 'right' ? 1 : -1) * Math.max(window.innerWidth, 480))
    if (!user) { window.setTimeout(() => finishAdvance(dish, direction, false), 350); return }
    void persistAndAdvance(dish, direction)
  }, [currentIndex, dishes, finishAdvance, persistAndAdvance, user])

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
  const changeRadius = (nextRadius: number) => {
    const nextPreferences = { ...preferences, distanceMiles: nextRadius }
    setRadius(nextRadius)
    setPreferences(nextPreferences)
    writeDiscoveryPreferences(nextPreferences)
    if (user) void getSupabase()?.auth.updateUser({ data: { [ACCOUNT_DISCOVERY_PREFERENCES_KEY]: nextPreferences } })
  }
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

  useEffect(() => {
    if (loading || loadingMore || feedError || !preferencesReady || authLoading || !discoveryModeReady) return
    if (currentIndex < dishes.length) return

    if (feedTab === 'nearby' && !replayMode) return

    if (dishes.length === 0) {
      if (!replayMode) enableReplay()
      return
    }

    const timer = window.setTimeout(() => {
      setReplayMode(true)
      setAnnouncement('You’ve seen everything. Reshuffling food.')
      seenKeys.current.clear()
      setCurrentIndex(0)
      void fetchDishes({ reset: true, replay: true })
        }, 150)
    return () => window.clearTimeout(timer)
  }, [authLoading, currentIndex, discoveryModeReady, dishes.length, feedError, feedTab, loading, loadingMore, preferencesReady, replayMode])
  const currentDish = dishes[currentIndex]
  const nextDish = dishes[currentIndex + 1]
  const locationLabel = currentDish ? shortLocation(currentDish) : null
  const rotation = Math.max(-10, Math.min(10, dragX * 0.025))
  const hasTemporaryFilters = Boolean(filters.cuisine || filters.dietary || filters.health || filters.priceRange || filters.spiceLevel)
  const hasSavedPreferences = hasActiveDiscoveryPreferences(preferences)
  const nextRadius = radius < 3 ? 3 : radius < 5 ? 5 : radius < 10 ? 10 : radius < 15 ? 15 : null
  const expandNearby = (preserveSeen = false) => {
    if (!nextRadius) return
    changeRadius(nextRadius)
    void fetchDishes({ reset: true, preserveSeen, nextMode: 'nearby', nextRadius })
  }
  const trackExternalAction = useCallback((action: 'order' | 'apple_maps' | 'google_maps' | 'call' | 'website') => {
    const actionDish = matchDish
    if (!user || !actionDish) return
    void authFetch('/api/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: action === 'order' ? 'order_intent' : 'creator_engagement',
        dish_id: actionDish.contentKind === 'official' ? actionDish.id : null,
        community_post_id: actionDish.contentKind === 'community' ? actionDish.id : null,
        seller_id: actionDish.contentKind === 'official' ? actionDish.seller.id : null,
        metadata: { action, content_kind: actionDish.contentKind, content_id: actionDish.id, place_id: actionDish.contentKind === 'official' ? null : actionDish.seller.id },
      }),
    }).catch(() => undefined)
  }, [matchDish, user])

  useEffect(() => {
    if (!currentDish || tourAutoChecked.current) return
    tourAutoChecked.current = true
    let seen = false
    try { seen = localStorage.getItem(DISCOVER_TOUR_KEY) === 'true' } catch {}
    if (seen) return
    const timer = window.setTimeout(() => setShowDiscoverTour(true), 500)
    return () => window.clearTimeout(timer)
  }, [currentDish])

  const closeDiscoverTour = useCallback(() => setShowDiscoverTour(false), [])

  const BrandHeader = () => <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-2 safe-top"><div className="max-w-md mx-auto flex items-center justify-between"><Link href="/swipe" className="flex items-center gap-2 min-w-0 overflow-hidden"><BrandMark size={30} className="shrink-0" /><span className="font-bold text-base text-hs-cream tracking-tight whitespace-nowrap truncate block max-w-[170px] sm:max-w-none">Hunger Swipes</span></Link><div className="ml-2 flex shrink-0 items-center gap-1"><button type="button" onClick={() => setShowDiscoverTour(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-hs-gray hover:bg-hs-soft hover:text-hs-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-hs-gold" aria-label="Show me around"><Eye size={20} aria-hidden="true" /></button>{!user && <Link href="/auth" className="shrink-0 text-sm font-semibold text-hs-gold hover:text-hs-gold-light transition whitespace-nowrap">Sign in</Link>}</div></div></header>

  const DiscoverShell = ({ children, includeModeSwitch = true }: { children: React.ReactNode; includeModeSwitch?: boolean }) => (
    <div className="min-h-screen bg-hs-ink flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex flex-col px-4 pt-3 pb-20 max-w-md mx-auto w-full">
        <h1 className="text-hs-cream text-xl font-black tracking-tight mb-1">Discover food near you</h1>
        <p className="text-hs-gray text-xs mb-3">Swipe through real dishes from local food businesses and community food posts. Save what you want, pass on the rest.</p>
        {includeModeSwitch && <DiscoveryModeSwitch value={discoveryMode} onChange={onDiscoveryModeChange} />}
        <div className="flex flex-wrap gap-2 mb-3">
          <Link href="/nearby" className="px-3 py-1.5 rounded-full bg-hs-soft text-hs-cream text-xs font-semibold hover:bg-hs-gold hover:text-hs-black transition">Nearby</Link>
          <Link href="/vendors" className="px-3 py-1.5 rounded-full bg-hs-soft text-hs-cream text-xs font-semibold hover:bg-hs-gold hover:text-hs-black transition">Local Sellers</Link>
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
        title={replayMode ? 'Nothing to replay in this mode' : discoveryMode === 'make' ? 'Recipes are coming soon' : feedTab === 'following' ? 'No new food from people you follow' : feedTab === 'nearby' ? `No food found within ${radius} ${radius === 1 ? 'mile' : 'miles'}` : 'No dishes match'}
        body={replayMode ? 'This mode has no dishes to replay right now.' : discoveryMode === 'make' ? 'No publish-ready recipes are available yet. We will show them here after their food and recipe are approved.' : feedTab === 'following' ? 'Follow creators from a community dish or food profile, then their approved posts will appear here.' : feedTab === 'nearby' ? 'Keep your current distance or choose when to expand it. Hunger Swipes will never expand it silently.' : 'Adjust your filters or check back when more food is published.'}
        action={
          <div className="flex flex-col gap-3">
            {!replayMode && feedTab === 'nearby' && nextRadius && (
              <button onClick={() => expandNearby(false)} className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm">
                Expand to {nextRadius} miles
              </button>
            )}
            {!replayMode && feedTab === 'following' && (
              <button onClick={() => { setFeedTab('for-you'); void fetchDishes({ reset: true, nextMode: 'for-you' }) }} className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm">
                Browse all local food
              </button>
            )}
            {!replayMode && (
              <button
                onClick={enableReplay}
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                <ReplayFoodIcon size={18} /> Refresh Food
              </button>
            )}
            {hasTemporaryFilters && (
              <button
                onClick={() => { setFilters(EMPTY_FILTERS); void fetchDishes({ reset: true, nextFilters: EMPTY_FILTERS }) }}
                className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm"
              >
                Clear Current Filters
              </button>
            )}
            {hasSavedPreferences && !replayMode && (
              <Link href="/preferences" className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm">Adjust Preferences</Link>
            )}
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
        title={feedTab === 'nearby' && !replayMode ? `That’s everything within ${radius} ${radius === 1 ? 'mile' : 'miles'}` : replayMode ? 'Replayed everything' : 'You’re all caught up'}
        body={refillError ? 'More dishes could not be loaded.' : feedTab === 'nearby' && !replayMode ? nextRadius ? 'Would you like us to look farther away?' : 'You’ve seen all nearby food within your widest distance.' : replayMode ? 'You’ve cycled through everything available for replay.' : 'You’ve seen everything available for these filters.'}
        action={
          <div className="flex flex-col gap-3">
            {refillError && <button onClick={() => fetchDishes()} className="px-6 py-3 bg-hs-soft text-hs-cream rounded-full font-semibold text-sm">Retry</button>}
            {feedTab === 'nearby' && !replayMode && nextRadius && (
              <button onClick={() => expandNearby(true)} className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm">
                Look up to {nextRadius} miles away
              </button>
            )}
            {feedTab === 'nearby' && !replayMode && !nextRadius && (
              <button onClick={enableReplay} className="px-8 py-3 bg-hs-soft text-hs-cream rounded-full font-bold text-sm inline-flex items-center justify-center gap-2">
                <ReplayFoodIcon size={18} /> Review nearby food again
              </button>
            )}
            {!replayMode && feedTab !== 'nearby' && (
              <button
                onClick={enableReplay}
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                <ReplayFoodIcon size={18} /> Refresh Food
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
        <div id="discover-mode-switch"><DiscoveryModeSwitch value={discoveryMode} onChange={onDiscoveryModeChange} /></div>
        <div className="flex items-center justify-between mb-1 shrink-0"><div className="flex items-center gap-2 text-hs-gray text-xs font-medium min-w-0"><span className="capitalize whitespace-nowrap">{feedTab.replace('-', ' ')}</span>{feedTab === 'nearby' && currentDish.distanceMiles != null && <span className="text-hs-gold">• {currentDish.distanceMiles} mi</span>}{loadingMore && <span aria-live="polite">• loading more</span>}</div><button id="discover-filter-button" onClick={() => setShowFilters(true)} className={`flex items-center justify-center min-w-[44px] min-h-[44px] px-2.5 rounded-full text-[11px] font-semibold transition border ${filters.cuisine || filters.dietary || filters.health || filters.priceRange ? 'bg-hs-gold text-hs-black border-hs-gold' : 'bg-hs-soft/60 text-hs-cream border-transparent hover:border-hs-gold/30'}`} aria-label="Filters"><FilterIcon size={12} /><span className="hidden sm:inline ml-1">Filters</span></button></div>
        {feedTab === 'nearby' && dishes.length <= 2 && nextRadius && (
          <button type="button" onClick={() => expandNearby(false)} className="mb-2 min-h-10 w-full rounded-xl border border-hs-gold/30 bg-hs-gold/10 px-3 text-xs font-bold text-hs-gold">
            Only {dishes.length} nearby {dishes.length === 1 ? 'dish' : 'dishes'} within {radius} mi · Look farther
          </button>
        )}
        {!online && <div role="status" className="mb-2 rounded-xl bg-hs-red/10 px-3 py-2 text-center text-xs text-hs-red">Offline — authenticated choices stay on the card until saved.</div>}
        {swipeFailure && <div role="alert" className="mb-2 flex items-center gap-2 rounded-xl border border-hs-red/30 bg-hs-red/10 px-3 py-2 text-xs text-hs-cream"><span className="flex-1">{swipeFailure.message}</span>{swipeFailure.retryable ? <button onClick={retrySwipe} className="min-h-9 rounded-lg bg-hs-gold px-3 font-bold text-hs-black">Retry</button> : swipeFailure.kind === 'auth' ? <Link href="/auth?next=/swipe" className="font-bold text-hs-gold">Sign in</Link> : <button onClick={() => { setSwipeFailure(null); setPendingSwipe(null); setActionState('idle') }} className="font-bold text-hs-gold">Dismiss</button>}</div>}
        <div className="relative flex-1 min-h-0 w-full mx-auto">
          {nextDish && <div key={`preview-${nextDish.id}`} className="absolute inset-x-[2%] top-[1%] bottom-[2%] rounded-[1.5rem] overflow-hidden bg-hs-graphite shadow-card scale-[0.97] opacity-40">{nextDish.videoUrl ? <FoodVideo src={nextDish.videoUrl} poster={nextDish.posterUrl || nextDish.imageUrl} className="w-full h-full" /> : <DishImage src={nextDish.imageUrl} alt="" sizes="(max-width: 480px) 92vw, 430px" quality={72} className="w-full h-full object-cover dish-image" />}</div>}
          <article id="discover-swipe-card" key={`current-${currentDish.id}`} className={`absolute inset-0 rounded-[1.5rem] overflow-hidden shadow-card-lg bg-hs-graphite select-none outline-none focus-visible:ring-2 focus-visible:ring-hs-gold ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ transform: `translate3d(${dragX}px, 0, 0) rotate(${rotation}deg)`, transitionProperty: isDragging ? 'none' : 'transform, opacity', transitionDuration: '300ms', touchAction: 'pan-y' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(event) => finishPointer(event)} onPointerCancel={(event) => finishPointer(event, true)} onKeyDown={(event) => { if (event.key === 'ArrowLeft') commitSwipe('left'); if (event.key === 'ArrowRight') commitSwipe('right') }} tabIndex={0} aria-label={`${currentDish.dish} from ${currentDish.restaurant}. Use left arrow to pass or right arrow to want.`} aria-busy={actionState === 'persisting'} data-testid="swipe-card">
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
                  {user ? 'Saved ♥️' : 'SIGN IN TO SAVE'}
                </div>
              </div>
            )}
            {lastSwipe === 'left' && <div className="absolute inset-0 bg-hs-red/20 flex items-center justify-center"><div className="bg-hs-red text-white text-2xl font-black px-5 py-2.5 rounded-2xl rotate-[12deg] shadow-lg">PASS</div></div>}
            {currentDish.contentKind === 'community' && <div className="absolute top-3 left-3"><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm border border-white/20">Community</span></div>}
            {user && currentDish.contentKind === 'community' && currentDish.creatorUserId && currentDish.creatorUserId !== user.id && <div className="absolute right-3 top-3 z-10"><ContentSafetyMenu postId={currentDish.id} creatorUserId={currentDish.creatorUserId} onBlocked={() => { setDishes((items) => items.filter((item) => item.creatorUserId !== currentDish.creatorUserId)); setAnnouncement('Creator blocked. Their posts are hidden.') }} /></div>}
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
                {currentDish.seller.hours_text && <p className="mt-1 flex items-center gap-1 text-[11px] text-white/65"><Clock3 size={12} aria-hidden="true" /><span className="truncate">{currentDish.seller.hours_text}</span></p>}
              </div>
              <div className="flex items-center justify-between gap-3 mb-3">
                {currentDish.seller?.id && user?.id && currentDish.seller?.owner_user_id !== user.id && (currentDish.contentKind !== 'community' || currentDish.creatorUserId) && (
                  <FollowButton
                    followingType={currentDish.contentKind === 'community' ? 'user' : 'seller'}
                    followingId={currentDish.contentKind === 'community' ? currentDish.creatorUserId! : currentDish.seller.id}
                    variant="compact"
                    onChange={(following) => {
                      if (!following && feedTab === 'following') {
                        setDishes((items) => items.filter((item) => item.contentKind === 'community' ? item.creatorUserId !== currentDish.creatorUserId : item.seller.id !== currentDish.seller.id))
                      }
                    }}
                  />
                )}
              </div>
                <div className="flex items-center justify-center gap-7">
    <IconButton label={`Pass on ${currentDish.dish}`} disabled={actionLock.current} onClick={() => commitSwipe('left')} className="w-14 h-14 sm:w-16 sm:h-16 bg-hs-red/10 border-2 border-hs-red text-hs-red shadow-lg backdrop-blur-sm hover:scale-105 hover:bg-hs-red hover:text-white transition active:scale-95"><PassIcon size={24} className="sm:w-7 sm:h-7" /></IconButton>
    <IconButton label={`Want ${currentDish.dish}`} disabled={actionLock.current} onClick={() => commitSwipe('right')} className="w-16 h-16 sm:w-[72px] sm:h-[72px] bg-hs-gold text-hs-black shadow-gold hover:scale-105 hover:bg-hs-gold-light transition active:scale-95"><WantItIcon size={30} className="sm:w-8 sm:h-8" /></IconButton>
              </div></div>
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
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.75rem)] z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-hs-gold/25 bg-hs-charcoal/95 px-4 py-3 text-left shadow-card-lg backdrop-blur-xl" role="status">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hs-gold/15 text-hs-gold">
            <RotateCcw size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-black text-hs-cream">Fresh look</span>
            <span className="mt-0.5 block text-xs leading-snug text-hs-gray">We reshuffled food you&apos;ve seen.</span>
          </span>
        </div>
      )}
      {matchDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" role="dialog" aria-modal="true" aria-labelledby="saved-title" data-testid="swipe-countdown">
          <div
            className="bg-hs-charcoal rounded-[2rem] p-6 text-center border border-white/[0.08] shadow-card-lg w-full max-w-sm"
          >
            <div className="w-16 h-16 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-4 text-hs-gold"><WantItIcon size={40} /></div>
            <h2 id="saved-title" className="text-2xl font-black text-hs-cream mb-1">{user ? 'Saved' : 'Looks good?'}</h2>
            <p className="text-hs-gray text-sm mb-4">{user ? 'Added to your saved dishes.' : 'Preview the place now. Sign in when you want to save dishes.'}</p>
            <p className="text-lg font-bold text-hs-cream">{matchDish.dish}</p>
            <p className="text-hs-gray text-sm mb-5">{matchDish.restaurant}</p>
            <div
              className="flex justify-center mb-5"
              onPointerDown={() => setMatchPaused(true)}
              onFocusCapture={() => setMatchPaused(true)}
            >
              <PlaceActions place={{ ...matchDish.seller, name: matchDish.seller.business_name, order_url: matchDish.seller.order_url || matchDish.seller.ordering_url }} onAction={trackExternalAction} />
            </div>
            <div className="rounded-2xl bg-hs-soft/70 px-4 py-3 mb-4" aria-live="polite">
              <p className="text-sm font-bold text-hs-cream">
                {matchPaused ? 'Paused — take your time.' : <>Next dish in <span data-testid="countdown-number">{matchCountdown}</span> second{matchCountdown === 1 ? '' : 's'}</>}
              </p>
              {!matchPaused && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full bg-hs-gold transition-[width] duration-1000 ease-linear" style={{ width: `${(matchCountdown / MATCH_CONFIRMATION_SECONDS) * 100}%` }} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {user ? (
                <button type="button" onClick={() => setMatchPaused(true)} disabled={matchPaused} className="min-h-12 rounded-xl border border-white/10 bg-hs-soft px-4 font-bold text-hs-cream disabled:opacity-50">Stay Here</button>
              ) : (
                <Link href="/auth?mode=signup&next=/swipe" className="min-h-12 rounded-xl border border-white/10 bg-hs-soft px-4 font-bold text-hs-cream inline-flex items-center justify-center">Sign in to save</Link>
              )}
              <button type="button" onClick={closeMatch} className="min-h-12 rounded-xl bg-hs-gold px-4 font-bold text-hs-black">Keep Swiping →</button>
            </div>
          </div>
        </div>
      )}
      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onChange={setFilters} onApply={applyFilters} onClear={clearFilters} mode={feedTab} onModeChange={changeMode} canUseFollowing={Boolean(user)} radius={radius} onRadiusChange={changeRadius} locationState={locationState} onRequestLocation={requestLocation} />
      <MobileNav />
      <TutorialCoachMark open={showDiscoverTour} steps={DISCOVER_TOUR_STEPS} storageKey={DISCOVER_TOUR_KEY} onClose={closeDiscoverTour} />
    </div>
  )
}
