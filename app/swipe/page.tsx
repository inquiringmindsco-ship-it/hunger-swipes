'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CUISINE_TAGS, DIETARY_TAGS, HEALTH_CATEGORIES, SPICE_LEVELS } from '@/lib/tags'
import { getTierBadge } from '@/lib/metadata-scoring'
import { ForkFlame, ForkFlameLarge, Flame, Camera, Heart, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, Gear, CheckLine, Close, CloseSolid, OrderMark, Filter, Leaf, Globe, Veggie, Light, Rising, SuperSwipe, DollarLine, CheckBold } from '@/app/components/HwIcon'

interface FoodPhoto {
  id: string
  imageUrl: string
  restaurant: string
  location: string
  dish: string
  cuisine: string
  cuisineTags?: string[]
  priceRange: string
  photographer: string
  commissionRate: number
  hungerScore: number
  // Metadata
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
  // Vendor / discount
  hasDiscount?: boolean
  discountOffer?: string
  discountCode?: string
  vendor?: { id: string; name: string; location_text: string }
}

const FALLBACK_PHOTOS: FoodPhoto[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop',
    restaurant: 'Pizzeria Locale',
    location: 'St. Louis, MO',
    dish: 'Margherita Pizza',
    cuisine: 'Italian',
    cuisineTags: ['Italian'],
    priceRange: '$$',
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
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop',
    restaurant: 'Green Bowl',
    location: 'St. Louis, MO',
    dish: 'Acai Sunrise Bowl',
    cuisine: 'Healthy',
    cuisineTags: ['American', 'Healthy'],
    priceRange: '$$',
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
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=800&fit=crop',
    restaurant: 'Stacked Pancakes',
    location: 'St. Louis, MO',
    dish: 'Blueberry Stack',
    cuisine: 'Breakfast',
    priceRange: '$',
    photographer: '@brunch_king',
    commissionRate: 0.08,
    hungerScore: 91,
    completenessScore: 30,
    metadataQualityStatus: 'basic',
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop',
    restaurant: 'Smoke & Fire BBQ',
    location: 'St. Louis, MO',
    dish: 'Brisket Platter',
    cuisine: 'BBQ',
    cuisineTags: ['American', 'BBQ'],
    priceRange: '$$$',
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
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&h=800&fit=crop',
    restaurant: 'Sakura Sushi',
    location: 'St. Louis, MO',
    dish: 'Dragon Roll',
    cuisine: 'Japanese',
    priceRange: '$$$',
    photographer: '@sushi_sensei',
    commissionRate: 0.15,
    hungerScore: 96,
    completenessScore: 45,
    metadataQualityStatus: 'enhanced',
  },
  {
    id: '6',
    imageUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&h=800&fit=crop',
    restaurant: 'Taco Loco',
    location: 'St. Louis, MO',
    dish: 'Carnitas Tacos',
    cuisine: 'Mexican',
    priceRange: '$',
    photographer: '@taco_tuesday',
    commissionRate: 0.10,
    hungerScore: 93,
    completenessScore: 20,
    metadataQualityStatus: 'basic',
  },
]

export default function SwipePage() {
  const [photos, setPhotos] = useState<FoodPhoto[]>(FALLBACK_PHOTOS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastSwipe, setLastSwipe] = useState<'left' | 'right' | 'up' | null>(null)
  const [matches, setMatches] = useState<FoodPhoto[]>([])
  const [showMatch, setShowMatch] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    cuisine: '',
    dietary: '',
    health: '',
    priceRange: '',
    spiceLevel: 0,
  })

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

    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.cuisine) params.set('cuisineTag', filters.cuisine)
      if (filters.dietary) params.set(filters.dietary, 'true')
      if (filters.health) params.set('healthCategory', filters.health)
      if (filters.priceRange) params.set('priceRange', filters.priceRange)
      if (filters.spiceLevel > 0) params.set('spiceLevel', filters.spiceLevel.toString())
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/photos${query}`)
      const data = await res.json()
      if (data.photos && data.photos.length > 0) {
        setPhotos(data.photos.map((p: any) => ({
          id: p.id,
          imageUrl: p.image_url,
          restaurant: p.restaurant_name,
          location: p.restaurant_location || '',
          dish: p.dish_name,
          cuisine: p.cuisine_type || '',
          cuisineTags: p.cuisine_tags,
          priceRange: p.price_range || '$',
          photographer: p.creator?.username || '@foodie',
          commissionRate: p.commission_rate || 0.10,
          hungerScore: p.hunger_score || 0,
          title: p.title,
          description: p.description,
          tags: p.tags,
          dietaryTags: p.dietary_tags,
          calories: p.calories,
          proteinGrams: p.protein_grams,
          carbsGrams: p.carbs_grams,
          fatGrams: p.fat_grams,
          spiceLevel: p.spice_level,
          portionSize: p.portion_size,
          vegetarianOption: p.vegetarian_option,
          veganOption: p.vegan_option,
          glutenFreeOption: p.gluten_free_option,
          healthCategory: p.health_category,
          completenessScore: p.completeness_score,
          metadataQualityStatus: p.metadata_quality_status,
        })))
      }
    } catch (err) {
      console.log('Using fallback photos')
    }
  }

  const applyFilters = () => {
    setShowFilters(false)
    fetchPhotos()
  }

  const saveMatches = (newMatches: FoodPhoto[]) => {
    setMatches(newMatches)
    localStorage.setItem('hungerswipes_matches', JSON.stringify(newMatches))
  }

  const recordSwipe = async (photoId: string, direction: string) => {
    if (user?.id) {
      try {
        await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId,
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
    if (!photos[currentIndex]) return

    const currentPhoto = photos[currentIndex]
    setLastSwipe(direction)

    if (direction === 'right' || direction === 'up') {
      const newMatches = [...matches, currentPhoto]
      saveMatches(newMatches)
      setShowMatch(true)
      setTimeout(() => setShowMatch(false), 1500)
    }

    recordSwipe(currentPhoto.id, direction)

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setLastSwipe(null)
      setDragOffset({ x: 0, y: 0 })
    }, 300)
  }, [currentIndex, photos, matches])

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

  if (currentIndex >= photos.length) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-8xl mb-6"><ForkFlame size={72} /></div>
          <h1 className="text-3xl font-bold text-white mb-4">You&apos;re all caught up!</h1>
          <p className="text-gray-400 mb-8">Check back later for more delicious photos.</p>
          <Link href="/matches" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
            View Your Matches ({matches.length})
          </Link>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]
  const nextPhoto = photos[currentIndex + 1]
  const tierBadge = getTierBadge(currentPhoto?.completenessScore || 0)

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
            <Link href="/vendor-intake" className="hidden sm:block text-sm text-white/60 hover:text-white font-semibold">
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
            {/* Cuisine Filter */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Cuisine</label>
              <div className="flex flex-wrap gap-1">
                {CUISINE_TAGS.slice(0, 10).map(c => (
                  <button
                    key={c}
                    onClick={() => setFilters({...filters, cuisine: c})}
                    className={`px-2 py-1 rounded text-xs ${
                      filters.cuisine === c ? 'bg-[#FF5722] text-white' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {/* Dietary Filter */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Dietary</label>
              <div className="flex flex-wrap gap-1">
                {['vegetarian', 'vegan', 'gluten-free', 'keto'].map(d => (
                  <button
                    key={d}
                    onClick={() => setFilters({...filters, dietary: d})}
                    className={`px-2 py-1 rounded text-xs ${
                      filters.dietary === d ? 'bg-[#10B981] text-white' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {/* Health Filter */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Health</label>
              <div className="flex flex-wrap gap-1">
                {HEALTH_CATEGORIES.map(h => (
                  <button
                    key={h}
                    onClick={() => setFilters({...filters, health: h})}
                    className={`px-2 py-1 rounded text-xs ${
                      filters.health === h ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-gray-400'
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
          {['For You', 'Nearby', 'Trending'].map((tab, i) => (
            <button
              key={tab}
              className={`flex-1 py-2 rounded-full font-medium text-sm transition ${
                i === 0 ? 'bg-[#FF5722] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Card Stack */}
        <div className="relative h-[65vh] max-h-[520px]">
          {/* Next Card (behind) */}
          {nextPhoto && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg scale-95 opacity-50">
              <img
                src={nextPhoto.imageUrl}
                alt={nextPhoto.dish}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Current Card */}
          {currentPhoto && (
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-[#1A1A1A] cursor-grab active:cursor-grabbing"
              style={getCardStyle()}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <img
                src={currentPhoto.imageUrl}
                alt={currentPhoto.dish}
                className="w-full h-full object-cover"
              />

              {/* Drag Overlays */}
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
                    <Flame size={14} /> SUPER HUNGER!
                  </div>
                </div>
              )}

              {/* Metadata Badges */}
              <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                {/* Tier Badge */}
                {currentPhoto.completenessScore !== undefined && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${tierBadge.bgColor}`} style={{ color: tierBadge.color }}>
                    {tierBadge.label}
                  </span>
                )}
                {/* Dietary Badges */}
                {currentPhoto.vegetarianOption && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/80 text-white flex items-center gap-1"><Leaf size={10} /> Veg</span>
                )}
                {currentPhoto.veganOption && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/80 text-white flex items-center gap-1"><Veggie size={10} /> Vegan</span>
                )}
                {currentPhoto.glutenFreeOption && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/80 text-white flex items-center gap-1"><Globe size={10} /> GF</span>
                )}
                {/* Calories Badge */}
                {currentPhoto.calories && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-white/80 text-gray-800">
                    {currentPhoto.calories} cal
                  </span>
                )}
                {/* Health Category */}
                {currentPhoto.healthCategory && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#8B5CF6]/80 text-white capitalize">
                    {currentPhoto.healthCategory}
                  </span>
                )}
                {/* Discount Badge */}
                {(currentPhoto as any).hasDiscount && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#FFD500] text-[#0D0D0D] flex items-center gap-1">
                    <Dollar size={10} /> {(currentPhoto as any).discountOffer?.split(' ').slice(0, 3).join(' ')}
                  </span>
                )}
              </div>

              {/* Card Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-white text-2xl font-bold mb-1">{currentPhoto.dish}</h2>
                    <p className="text-white/70 text-lg mb-2">
                      {currentPhoto.restaurant} · {currentPhoto.location}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span>{currentPhoto.cuisine}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#FFD700]">{currentPhoto.priceRange}</span>
                      <span>•</span>
                      <span><Camera size={14} /> {currentPhoto.photographer}</span>
                    </div>
                    {/* Metadata Tags */}
                    {currentPhoto.tags && currentPhoto.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentPhoto.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/80">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="bg-[#FFD700] text-[#0D0D0D] text-xs font-bold px-2 py-1 rounded-full">
                      {currentPhoto.hungerScore}+
                    </div>
                    <p className="text-xs text-white/50 mt-1">HungerScore™</p>
                  </div>
                </div>

                {/* Action Buttons */}
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

        {/* Swipe Hints */}
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

      {/* Match Popup */}
      {showMatch && currentPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] rounded-3xl p-8 text-center border border-white/10 animate-bounce">
            <div className="mb-4"><ForkFlameLarge size={64} /></div>
            <h2 className="text-2xl font-bold text-white mb-2">Match!</h2>
            <p className="text-gray-400 mb-4">Added to your matches</p>
            <p className="text-lg font-semibold text-white">{currentPhoto.dish}</p>
            <p className="text-gray-400">{currentPhoto.restaurant}</p>
            {currentPhoto.photographer && (
              <p className="text-sm text-[#FFD700] mt-2"><Camera size={14} /> {currentPhoto.photographer}</p>
            )}
            {(currentPhoto as any).hasDiscount && (currentPhoto as any).discountCode && (
              <div className="mt-3 bg-[#FFD700]/20 border border-[#FFD700]/40 rounded-xl px-4 py-2">
                <p className="text-xs text-[#FFD700] font-semibold">{(currentPhoto as any).discountOffer}</p>
                <p className="text-[#FFD700] font-mono font-bold text-sm mt-1">
                  Code: {(currentPhoto as any).discountCode}
                </p>
              </div>
            )}
            <Link
              href={`/visits?photoId=${currentPhoto.id}`}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700] text-[#0D0D0D] rounded-full text-sm font-semibold hover:bg-[#FFC000] transition"
            >
              Been here? Verify your visit →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
