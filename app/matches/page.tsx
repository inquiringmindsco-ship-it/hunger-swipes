'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, SettingsGear, CheckBold, StarFilled, ChatBubble, DollarSign } from '@/app/components/HwIcon'

interface Match {
  id: string
  imageUrl: string
  restaurant: string
  location: string
  dish: string
  cuisine: string
  priceRange: string
  photographer: string
  matchedAt: string
}

interface Verification {
  id: string
  photo_id: string
  verification_type: 'self-reported' | 'photo-confirmed' | 'receipt-confirmed'
  accuracy_rating?: 'accurate' | 'mostly_accurate' | 'not_accurate'
  trust_level: number
}

const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
    restaurant: 'Pizzeria Locale',
    location: 'St. Louis, MO',
    dish: 'Margherita Pizza',
    cuisine: 'Italian',
    priceRange: '$$',
    photographer: '@stlfoodie',
    matchedAt: '2 hours ago',
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop',
    restaurant: 'Smoke & Fire BBQ',
    location: 'St. Louis, MO',
    dish: 'Brisket Platter',
    cuisine: 'BBQ',
    priceRange: '$$$',
    photographer: '@meatlovers_mike',
    matchedAt: '5 hours ago',
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=400&fit=crop',
    restaurant: 'Sakura Sushi',
    location: 'St. Louis, MO',
    dish: 'Dragon Roll',
    cuisine: 'Japanese',
    priceRange: '$$$',
    photographer: '@sushi_sensei',
    matchedAt: '1 day ago',
  },
  {
    id: '6',
    imageUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=400&fit=crop',
    restaurant: 'Taco Loco',
    location: 'St. Louis, MO',
    dish: 'Carnitas Tacos',
    cuisine: 'Mexican',
    priceRange: '$',
    photographer: '@taco_tuesday',
    matchedAt: '2 days ago',
  },
]

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>(MOCK_MATCHES)
  const [filter, setFilter] = useState('all')
  const [verifications, setVerifications] = useState<Record<string, Verification[]>>({})

  useEffect(() => {
    // Load matches from localStorage (from swipe page)
    const storedMatches = localStorage.getItem('hungerswipes_matches')
    if (storedMatches) {
      try {
        setMatches(JSON.parse(storedMatches))
      } catch {}
    }

    // Load verifications for all matches
    fetchVerifications()
  }, [])

  const fetchVerifications = async () => {
    try {
      const res = await fetch('/api/visits')
      const data = await res.json()
      if (data.verifications) {
        // Group by photo_id
        const grouped: Record<string, Verification[]> = {}
        for (const v of data.verifications) {
          if (!grouped[v.photo_id]) grouped[v.photo_id] = []
          grouped[v.photo_id].push(v)
        }
        setVerifications(grouped)
      }
    } catch {}
  }

  const getAvgAccuracy = (photoId: string): string | null => {
    const v = verifications[photoId]
    if (!v || v.length === 0) return null
    const ratings = v.filter((x) => x.accuracy_rating).map((x) => x.accuracy_rating)
    if (ratings.length === 0) return null
    const accurate = ratings.filter((r) => r === 'accurate').length
    const mostly = ratings.filter((r) => r === 'mostly_accurate').length
    const pct = Math.round((accurate + mostly * 0.5) / ratings.length * 100)
    return `${pct}% accurate`
  }

  const cuisineFilters = ['All', 'Italian', 'BBQ', 'Japanese', 'Mexican', 'Healthy']
  const filteredMatches = filter === 'all'
    ? matches
    : matches.filter((m) => m.cuisine.toLowerCase() === filter.toLowerCase())

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="HungerSwipes" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-[#1A1A2E]">HungerSwipes</span>
          </div>
          <Link href="/swipe" className="text-[#FF5722] font-semibold">
            ← Swipe More
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Your Matches</h1>
            <p className="text-[#6B7280]">{matches.length} restaurants saved</p>
          </div>
          <div className="bg-[#FF5722] text-white px-4 py-2 rounded-full font-bold">
            {matches.length} <Bookmark size={22} />
          </div>
        </div>

        {/* Cuisine Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {cuisineFilters.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setFilter(cuisine.toLowerCase())}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                filter === cuisine.toLowerCase()
                  ? 'bg-[#FF5722] text-white'
                  : 'bg-white text-[#6B7280] hover:bg-gray-100'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>

        {/* Matches Grid */}
        {filteredMatches.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4"><ForkFlame size={40} /></div>
            <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">No matches yet</h2>
            <p className="text-[#6B7280] mb-6">Start swiping to build your food collection</p>
            <Link href="/swipe" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredMatches.map((match) => {
              const photoVerifications = verifications[match.id] || []
              const photoCount = photoVerifications.filter((v) => v.verification_type === 'photo-confirmed').length
              const receiptCount = photoVerifications.filter((v) => v.verification_type === 'receipt-confirmed').length
              const selfCount = photoVerifications.filter((v) => v.verification_type === 'self-reported').length
              const avgAccuracy = getAvgAccuracy(match.id)

              return (
                <div key={match.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative">
                    <img
                      src={match.imageUrl}
                      alt={match.dish}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <button className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-[#FF5722]">
                        ❤️
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-[#1A1A2E] truncate">{match.dish}</h3>
                    <p className="text-sm text-[#6B7280] truncate">{match.restaurant}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-[#FFD700]">{match.priceRange}</span>
                      <Link
                        href={`/visits?photoId=${match.id}`}
                        className="px-3 py-1 bg-[#FF5722] text-white text-xs rounded-full font-semibold hover:bg-[#e64a19] transition flex items-center gap-1"
                      >
                        ✓ Verify
                      </Link>
                    </div>
                    {/* Verification Stats */}
                    {photoVerifications.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-[#10B981] font-medium">
                          {photoVerifications.length} verified visit{photoVerifications.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {photoCount > 0 && <span className="text-[10px] text-blue-500"><Camera size={14} /> {photoCount} photo</span>}
                          {receiptCount > 0 && <span className="text-[10px] text-[#FFD700]">🧾 {receiptCount} receipt</span>}
                          {selfCount > 0 && <span className="text-[10px] text-gray-400">🏠 {selfCount} check-in</span>}
                        </div>
                        {avgAccuracy && <p className="text-[10px] text-gray-500 mt-0.5">{avgAccuracy}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA to keep swiping */}
        {matches.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-[#6B7280] mb-4">Want more matches?</p>
            <Link href="/swipe" className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#FF5722] text-[#FF5722] rounded-full font-semibold hover:bg-[#FF5722] hover:text-white transition">
              <span>Keep Swiping</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
