'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CUISINE_TAGS, DIETARY_TAGS, HEALTH_CATEGORIES, SPICE_LEVELS } from '@/lib/tags'
import { getTierBadge } from '@/lib/metadata-scoring'
import { ForkFlame, ForkFlameLarge, Flame, Camera, Heart, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, Gear, CheckLine, Close, CloseSolid, OrderMark, Filter, Leaf, Globe, Veggie, Light, Rising, SuperSwipe, DollarLine, CheckBold } from '@/app/components/HwIcon'

interface FoodDish {
  id: string
  imageUrl: string
  restaurant: string
  location: string
  dish: string
  cuisine: string
  cuisineTags?: string[]
  priceRange: string
  price: number
  photographer: string
  commissionRate: number
  hungerScore: number
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
  seller?: { id: string; business_name: string; location_text: string; phone?: string; ordering_method?: string; ordering_url?: string }
}

const FALLBACK_DISHES: FoodDish[] = [
  {
    id: 'mock-1',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop',
    restaurant: 'Pizzeria Locale',
    location: 'St. Louis, MO',
    dish: 'Margherita Pizza',
    cuisine: 'Italian',
    cuisineTags: ['Italian'],
    priceRange: '$$',
    price: 18,
    photographer: '@stlfoodie',
    commissionRate: 0.10,
    hungerScore: 94,
    title: 'Classic Margherita Pizza',
    description: 'Fresh mozzarella, San Marzano tomatoes, and fragrant basil on a perfectly crispy crust.',
    tags: ['pizza', 'cheesy', 'comfort food'],
    dietaryTags: ['vegetarian'],
    calories: 850,
    proteinGrams: 32,
    carbsGrams: 95,
    fatGrams: 38,
    spiceLevel: 1,
    portionSize: 'regular',
    vegetarianOption: true,
    veganOption: false,
    glutenFreeOption: false,
    healthCategory: 'indulgent',
    completenessScore: 75,
    metadataQualityStatus: 'top-tier',
  },
  {
    id: 'mock-2',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop',
    restaurant: 'Green Bowl',
    location: 'St. Louis, MO',
    dish: 'Acai Sunrise Bowl',
    cuisine: 'Healthy',
    cuisineTags: ['American', 'Healthy'],
    priceRange: '$$',
    price: 14,
    photographer: '@healthyeats_sarah',
    commissionRate: 0.12,
    hungerScore: 89,
    title: 'Acai Sunrise Bowl',
    description: 'Organic acai blended with banana and topped with fresh berries, granola, and honey.',
    tags: ['acai bowl', 'healthy', 'fresh'],
    dietaryTags: ['vegan', 'gluten-free', 'organic'],
    calories: 420,
    proteinGrams: 8,
    carbsGrams: 72,
    fatGrams: 12,
    spiceLevel: 1,
    portionSize: 'regular',
    vegetarianOption: true,
    veganOption: true,
    glutenFreeOption: true,
    healthCategory: 'healthy',
    completenessScore: 85,
    metadataQualityStatus: 'top-tier',
  },
  {
    id: 'mock-4',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop',
    restaurant: 'Smoke & Fire BBQ',
    location: 'St. Louis, MO',
    dish: 'Brisket Platter',
    cuisine: 'BBQ',
    cuisineTags: ['American', 'BBQ'],
    priceRange: '$$$',
    price: 28,
    photographer: '@meatlovers_mike',
    commissionRate: 0.10,
    hungerScore: 97,
    title: 'Texas-Style Brisket Platter',
    description: 'Slow-smoked 14-hour brisket with signature spice rub, served with two sides.',
    tags: ['BBQ ribs', 'steak', 'comfort food', 'soul food'],
    dietaryTags: ['gluten-free'],
    calories: 1200,
    proteinGrams: 65,
    carbsGrams: 45,
    fatGrams: 82,
    spiceLevel: 2,
    portionSize: 'large',
    vegetarianOption: false,
    veganOption: false,
    glutenFreeOption: true,
    healthCategory: 'indulgent',
    completenessScore: 65,
    metadataQualityStatus: 'enhanced',
  },
]

function priceToRange(price?: number): string {
  if (!price && price !== 0) return '$'
  if (price < 12) return '$'
  if (price < 24) return '$$'
  return '$$$'
}

export default function SwipePage() {
  const [dishes, setDishes] = useState<FoodDish[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastSwipe, setLastSwipe] = useState<'left' | 'right' | 'up' | null>(null)
  const getStoredMatches = (): FoodDish[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('hungerswipes_matches')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  const [matches, setMatches] = useState<FoodDish[]>(getStoredMatches)
  const [showMatch, setShowMatch] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [user, setUser] = useState<any>(null)
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

  useEffect(() => {
    const storedUser = localStorage.getItem('hungerswipes_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)

    const storedMatches = localStorage.getItem('hungerswipes_matches')
    if (storedMatches) {
      setMatches(JSON.parse(storedMatches))
    }

    fetchDishes()
  }, [])

  const mapDish = (d: any): FoodDish => ({
    id: d.id,
    imageUrl: d.photo_url || d.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop',
    restaurant: d.seller?.business_name || d.restaurant_name || 'Unknown',
    location: d.seller?.location_text || d.location_text || d.restaurant_location || 'St. Louis, MO',
    dish: d.name || d.dish_name || 'Mystery Dish',
    cuisine: d.category || d.cuisine_type || '',
    cuisineTags: d.tags || d.cuisine_tags || [],
    priceRange: priceToRange(typeof d.price === 'number' ? d.price : undefined),
    price: typeof d.price === 'number' ? d.price : 0,
    photographer: '@stlfoodie',
    commissionRate: 0.10,
    hungerScore: d.right_swipes && d.impressions ? Math.round((d.right_swipes / Math.max(1, d.impressions)) * 100) : 90,
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

  const fetchDishes = async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (user?.id) params.set('eaterId', user.id)
      if (filters.cuisine) params.set('cuisineTag', filters.cuisine)
      if (filters.dietary) params.set('dietaryTag', filters.dietary)
      if (filters.health) params.set('healthCategory', filters.health)
      if (filters.priceRange) params.set('priceRange', filters.priceRange)

      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/dishes${query}`)
      const data = await res.json()
      if (data.dishes && data.dishes.length > 0) {
        setDishes(data.dishes.map(mapDish))
      } else if (data.photos && data.photos.length > 0) {
        setDishes(data.photos.map(mapDish))
      } else {
        setDishes(FALLBACK_DISHES)
      }
    } catch (err) {
      console.log('Dishes feed unavailable, using fallback')
      setDishes(FALLBACK_DISHES)
    }
  }

  const applyFilters = () => {
    setShowFilters(false)
    fetchDishes()
  }

  const saveMatches = (newMatches: FoodDish[]) => {
    setMatches(newMatches)
    localStorage.setItem('hungerswipes_matches', JSON.stringify(newMatches))
  }

  const recordSwipe = async (dishId: string, direction: string) => {
    if (user?.id) {
      try {
        await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dishId,
            direction,
            eaterId: user.id
          })
        })
      } catch (err) {
        console.log('Swipe recording failed (non-critical)')
      }
    }
  }

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up') => {
    if (!dishes[currentIndex]) return

    const currentDish = dishes[currentIndex]
    setLastSwipe(direction)

    if (direction === 'right' || direction === 'up') {
      const newMatches = [...matches, currentDish]
      saveMatches(newMatches)
      setShowMatch(true)
      setTimeout(() => setShowMatch(false), 1500)
    }

    recordSwipe(currentDish.id, direction)

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setLastSwipe(null)
      setDragOffset({ x: 0, y: 0 })
    }, 300)
  }, [currentIndex, dishes, matches])

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
      } else if (Math.abs(deltaX) < 10 && Math.abs(dragOffset.y) > 80) {
        handleSwipe('up')
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
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (dishes.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-8xl mb-6"><ForkFlame size={72} /></div>
          <h1 className="text-3xl font-bold text-white mb-4">No plates yet</h1>
          <p className="text-gray-600 mb-8">Be the first to post a plate.</p>
          <Link href="/vendor-intake" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
            List Your Food
          </Link>
        </div>
      </div>
    )
  }

  if (currentIndex >= dishes.length) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-8xl mb-6"><ForkFlame size={72} /></div>
          <h1 className="text-3xl font-bold text-white mb-4">You're all caught up!</h1>
          <p className="text-gray-600 mb-8">Check back later for more delicious photos.</p>
          <Link href="/matches" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
            View Your Matches ({matches.length})
          </Link>
        </div>
      </div>
    )
  }

  const currentDish = dishes[currentIndex]
  const nextDish = dishes[currentIndex + 1]
  const tierBadge = getTierBadge(currentDish?.completenessScore || 0)

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="HungerSwipes" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-white">HungerSwipes</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/preferences" className="text-xl"><Gear size={22} /></Link>
            <Link href="/vendor" className="hidden sm:block text-sm text-[#FF5722] font-semibold">
              For Restaurants
            </Link>
            <Link href="/join" className="hidden sm:block text-sm text-white/60 hover:text-white font-semibold">
              + List Food
            </Link>
            <Link href="/matches" className="relative">
              <span className="text-2xl"><Bookmark size={22} /></span>
              {matches.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF5722] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {matches.length}
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
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              showFilters ? 'bg-[#FFD700] text-[#0D0D0D]' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Filter size={18} /> Filters
          </button>
          <button
            onClick={() => { setFilters({...filters, cuisine: ''}); applyFilters() }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.cuisine ? 'bg-[#FF5722] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {filters.cuisine || 'Cuisine'}
          </button>
          <button
            onClick={() => { setFilters({...filters, dietary: ''}); applyFilters() }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.dietary ? 'bg-[#10B981] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {filters.dietary || 'Dietary'}
          </button>
          <button
            onClick={() => { setFilters({...filters, health: ''}); applyFilters() }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
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
                    className={`px-2 py-1 rounded text-xs ${
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
                    className={`px-2 py-1 rounded text-xs ${
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
                    className={`px-2 py-1 rounded text-xs ${
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
              className="w-full py-2 bg-[#FFD700] text-[#0D0D0D] rounded-lg font-semibold text-sm"
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
                setFilters({ ...filters, cuisine: '' })
                applyFilters()
              }}
              className={`flex-1 py-2 rounded-full font-medium text-sm transition ${
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
                    ORDER! <ForkFlame size={72} />
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
              {lastSwipe === 'up' && (
                <div className="absolute inset-0 bg-[#FFD700]/50 flex items-center justify-center">
                  <div className="bg-[#FFD700] text-[#0D0D0D] text-4xl font-bold px-8 py-4 rounded-2xl shadow-lg">
                    <ForkFlameLarge size={72} /> SUPER HUNGER!
                  </div>
                </div>
              )}

              <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                {currentDish.completenessScore !== undefined && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${tierBadge.bgColor}`} style={{ color: tierBadge.color }}>
                    {tierBadge.label}
                  </span>
                )}
                {currentDish.vegetarianOption && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/80 text-white flex items-center gap-1"><Leaf size={10} /> Veg</span>
                )}
                {currentDish.veganOption && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/80 text-white flex items-center gap-1"><Veggie size={10} /> Vegan</span>
                )}
                {currentDish.glutenFreeOption && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/80 text-white flex items-center gap-1"><Globe size={10} /> GF</span>
                )}
                {currentDish.calories && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-white/80 text-gray-800">
                    {currentDish.calories} cal
                  </span>
                )}
                {currentDish.healthCategory && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#8B5CF6]/80 text-white capitalize">
                    {currentDish.healthCategory}
                  </span>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-white text-2xl font-bold mb-1">{currentDish.dish}</h2>
                    <p className="text-white/70 text-lg mb-2">
                      {currentDish.restaurant} · {currentDish.location}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span>{currentDish.cuisine}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#FFD700]">${currentDish.price.toFixed(2)}</span>
                    </div>
                    {currentDish.tags && currentDish.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentDish.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/80">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="bg-[#FFD700] text-[#0D0D0D] text-xs font-bold px-2 py-1 rounded-full">
                      {currentDish.hungerScore}
                    </div>
                    <p className="text-xs text-white/50 mt-1">HungerScore™</p>
                  </div>
                </div>

                <div className="flex justify-center gap-5 mt-6">
                  <button
                    onClick={() => handleSwipe('left')}
                    className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white text-xl hover:bg-white/20 transition hover:scale-105"
                  >
                    <Close size={22} />
                  </button>
                  <button
                    onClick={() => handleSwipe('up')}
                    className="w-14 h-14 rounded-full bg-[#FFD700] flex items-center justify-center text-[#0D0D0D] text-xl hover:scale-110 transition shadow-lg shadow-[#FFD700]/30"
                  >
                    <Flame size={14} />
                  </button>
                  <button
                    onClick={() => handleSwipe('right')}
                    className="w-14 h-14 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xl hover:scale-110 transition shadow-lg shadow-[#10B981]/30"
                  >
                    <ForkFlame size={72} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-8 mt-6 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <SwipeLeft size={16} />
            <span>Pass</span>
          </div>
          <div className="flex items-center gap-2">
            <SuperSwipe size={16} />
            <span>Super</span>
          </div>
          <div className="flex items-center gap-2">
            <SwipeRight size={16} />
            <span>Order</span>
          </div>
        </div>
      </main>

      {showMatch && currentDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-3xl p-8 text-center border border-white/10 animate-bounce">
            <div className="mb-4"><ForkFlameLarge size={64} /></div>
            <h2 className="text-2xl font-bold text-white mb-2">Match!</h2>
            <p className="text-gray-600 mb-4">Added to your matches</p>
            <p className="text-lg font-semibold text-white">{currentDish.dish}</p>
            <p className="text-gray-600">{currentDish.restaurant}</p>
            {currentDish.seller?.phone && (
              <a href={`tel:${currentDish.seller.phone}`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-full text-sm font-semibold">
                📞 Call to order
              </a>
            )}
            {currentDish.seller?.ordering_url && (
              <a href={currentDish.seller.ordering_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700] text-[#0D0D0D] rounded-full text-sm font-semibold">
                🌐 Order online
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
