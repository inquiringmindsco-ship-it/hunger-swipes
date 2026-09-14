'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CUISINE_TAGS, DIETARY_TAGS, HEALTH_CATEGORIES, SPICE_LEVELS } from '@/lib/tags'
import { Bookmark, Settings, SlidersHorizontal } from 'lucide-react'
import { BrandMark, PassIcon, WantItIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import PlaceActions from '@/app/components/PlaceActions'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center pb-20">
        <div className="text-white text-xl">Loading...</div>
        <MobileNav />
      </div>
    )
  }

  if (dishes.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center pb-20">
        <div className="text-center px-4">
          <div className="mb-6 flex justify-center"><BrandMark size={72} /></div>
          <h1 className="text-3xl font-bold text-white mb-4">No dishes are live yet.</h1>
          <p className="text-gray-400 mb-8">Check back soon, or invite a food seller to publish the first dish.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => fetchDishes(filters, feedTab)} className="min-h-11 px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition">
              Refresh
            </button>
            <Link href="/join" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
              List Your Food
            </Link>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  if (currentIndex >= dishes.length) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center pb-20">
        <div className="text-center px-4">
          <div className="mb-6 flex justify-center"><BrandMark size={72} /></div>
          <h1 className="text-3xl font-bold text-white mb-4">You're all caught up!</h1>
          <p className="text-gray-600 mb-8">Check back later for more delicious photos.</p>
          <Link href="/saved" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
            View Saved ({savedCount})
          </Link>
        </div>
        <MobileNav />
      </div>
    )
  }

  const currentDish = dishes[currentIndex]
  const nextDish = dishes[currentIndex + 1]

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="font-bold text-lg text-white">HungerSwipes</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/preferences" aria-label="Food preferences" title="Food preferences" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white">
              <Settings size={21} aria-hidden="true" />
            </Link>
            <Link href="/join" className="hidden sm:block text-sm text-[#FF5722] font-semibold">
              For Restaurants
            </Link>
            <Link href="/join" className="hidden sm:block text-sm text-white/60 hover:text-white font-semibold">
              + List Food
            </Link>
            <Link href="/matches" aria-label={`Saved dishes${savedCount ? `, ${savedCount}` : ''}`} title="Saved dishes" className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white">
              <Bookmark size={21} aria-hidden="true" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF5722] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {savedCount}
                </span>
              )}
            </Link>
            {!user && (
              <Link href="/auth" className="text-sm text-[#FF5722] font-semibold">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-[#1A1A1A] border-b border-white/5 px-4 py-2">
        <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`min-h-11 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              showFilters ? 'bg-[#FFD700] text-[#0D0D0D]' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <SlidersHorizontal size={18} aria-hidden="true" /> Filters
          </button>
          <button
            onClick={() => { const next = {...filters, cuisine: ''}; setFilters(next); fetchDishes(next, feedTab) }}
            className={`min-h-11 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.cuisine ? 'bg-[#FF5722] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {filters.cuisine || 'Cuisine'}
          </button>
          <button
            onClick={() => { const next = {...filters, dietary: ''}; setFilters(next); fetchDishes(next, feedTab) }}
            className={`min-h-11 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.dietary ? 'bg-[#10B981] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {filters.dietary || 'Dietary'}
          </button>
          <button
            onClick={() => { const next = {...filters, health: ''}; setFilters(next); fetchDishes(next, feedTab) }}
            className={`min-h-11 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.health ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {filters.health || 'Health'}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-[#1A1A1A] border-b border-white/5 px-4 py-4">
          <div className="max-w-lg mx-auto space-y-4">
            <div>
              <label className="text-xs text-gray-600 mb-2 block">Cuisine</label>
              <div className="flex flex-wrap gap-1">
                {CUISINE_TAGS.slice(0, 10).map(c => (
                  <button
                    key={c}
                    onClick={() => setFilters({...filters, cuisine: c})}
                    className={`min-h-11 px-3 py-2 rounded text-xs ${
                      filters.cuisine === c ? 'bg-[#FF5722] text-white' : 'bg-white/10 text-gray-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-2 block">Dietary</label>
              <div className="flex flex-wrap gap-1">
                {['vegetarian', 'vegan', 'gluten-free', 'keto'].map(d => (
                  <button
                    key={d}
                    onClick={() => setFilters({...filters, dietary: d})}
                    className={`min-h-11 px-3 py-2 rounded text-xs ${
                      filters.dietary === d ? 'bg-[#10B981] text-white' : 'bg-white/10 text-gray-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-2 block">Health</label>
              <div className="flex flex-wrap gap-1">
                {HEALTH_CATEGORIES.map(h => (
                  <button
                    key={h}
                    onClick={() => setFilters({...filters, health: h})}
                    className={`min-h-11 px-3 py-2 rounded text-xs ${
                      filters.health === h ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-gray-600'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={applyFilters}
              className="w-full min-h-11 py-2 bg-[#FFD700] text-[#0D0D0D] rounded-lg font-semibold text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Swipe Area */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4 bg-white/5 rounded-full p-1">
          {[
            { key: 'for-you' as const, label: 'For You' },
            { key: 'nearby' as const, label: 'Nearby' },
            { key: 'trending' as const, label: 'Trending' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setFeedTab(key)
                fetchDishes(filters, key)
              }}
              className={`flex-1 min-h-11 py-2 rounded-full font-medium text-sm transition ${
                feedTab === key ? 'bg-[#FF5722] text-white' : 'text-gray-600 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Card Stack */}
        <div className="relative h-[65vh] max-h-[520px]">
          {nextDish && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg scale-95 opacity-50">
              <img
                src={nextDish.imageUrl}
                alt={nextDish.dish}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {currentDish && (
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-[#1A1A1A] cursor-grab active:cursor-grabbing"
              style={getCardStyle()}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <img
                src={currentDish.imageUrl}
                alt={currentDish.dish}
                className="w-full h-full object-cover"
              />

              {lastSwipe === 'right' && (
                <div className="absolute inset-0 bg-[#10B981]/40 flex items-center justify-center">
                  <div className="bg-[#10B981] text-white text-4xl font-bold px-8 py-4 rounded-2xl rotate-[-15deg] shadow-lg">
                    WANT IT <WantItIcon size={46} className="inline-block" />
                  </div>
                </div>
              )}
              {lastSwipe === 'left' && (
                <div className="absolute inset-0 bg-[#EF4444]/40 flex items-center justify-center">
                  <div className="bg-[#EF4444] text-white text-4xl font-bold px-8 py-4 rounded-2xl rotate-[15deg] shadow-lg">
                    NOPE
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${currentDish.contentKind === 'official' ? 'bg-[#FFD700] text-black' : 'bg-sky-500 text-white'}`}>
                  {currentDish.contentKind === 'official' ? 'Official dish' : 'Community post'}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                <div>
                  <h2 className="text-white text-2xl font-bold mb-1">{currentDish.dish}</h2>
                  <p className="text-white/75 text-lg">{currentDish.restaurant}</p>
                </div>

                <div className="flex justify-center gap-6 mt-6">
                  <IconButton
                    label={`Pass on ${currentDish.dish}`}
                    onClick={() => handleSwipe('left')}
                    className="h-16 w-16 border border-white/20 bg-black/35 text-white shadow-xl backdrop-blur hover:scale-105 hover:bg-black/55"
                  >
                    <PassIcon size={29} />
                  </IconButton>
                  <IconButton
                    label={`Want ${currentDish.dish}`}
                    onClick={() => handleSwipe('right')}
                    className="h-16 w-16 bg-[#10B981] text-white shadow-xl shadow-[#10B981]/25 hover:scale-105 hover:bg-[#0f9f71]"
                  >
                    <WantItIcon size={31} />
                  </IconButton>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-8 mt-6 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <PassIcon size={17} />
            <span>PASS</span>
          </div>
          <div className="flex items-center gap-2">
            <WantItIcon size={17} />
            <span>WANT IT</span>
          </div>
        </div>
      </main>

      {showMatch && currentDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-3xl p-8 text-center border border-white/10 animate-bounce">
            <div className="mb-4 flex justify-center text-[#10B981]"><WantItIcon size={64} /></div>
            <h2 className="text-2xl font-bold text-white mb-2">Match!</h2>
            <p className="text-gray-600 mb-4">Added to your matches</p>
            <p className="text-lg font-semibold text-white">{currentDish.dish}</p>
            <p className="text-gray-600">{currentDish.restaurant}</p>
            <div className="mt-4 flex justify-center"><PlaceActions place={{ ...currentDish.seller, name: currentDish.seller.business_name, order_url: currentDish.seller.order_url || currentDish.seller.ordering_url }} /></div>
          </div>
        </div>
      )}
      <MobileNav />
    </div>
  )
}
