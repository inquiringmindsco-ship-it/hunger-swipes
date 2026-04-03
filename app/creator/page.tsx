'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, Gear, CheckBold } from '@/app/components/HwIcon'
import { getTierBadge } from '@/lib/metadata-scoring'

interface Photo {
  id: string
  imageUrl: string
  dish: string
  restaurant: string
  hungerScore: number
  completenessScore: number
  metadataQualityStatus: string
  viralScore: number
  contentLabel: string
  totalSwipes: number
  rightSwipes: number
  orders: number
  earnings: number
  saves: number
  status: 'active' | 'pending' | 'inactive'
  hasRecipe: boolean
  missingItems?: string[]
}

interface EarningsBreakdown {
  orders: number
  tips: number
  recipes: number
  total: number
}

const MOCK_PHOTOS: Photo[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop',
    dish: 'Margherita Pizza',
    restaurant: 'Pizzeria Locale',
    hungerScore: 94,
    completenessScore: 75,
    metadataQualityStatus: 'top-tier',
    viralScore: 156,
    contentLabel: 'trending',
    totalSwipes: 12847,
    rightSwipes: 8234,
    saves: 342,
    orders: 342,
    earnings: 513.00,
    status: 'active',
    hasRecipe: false,
    missingItems: ['ingredient_tags', 'spice_level'],
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    dish: 'Acai Bowl',
    restaurant: 'Green Bowl',
    hungerScore: 89,
    completenessScore: 85,
    metadataQualityStatus: 'top-tier',
    viralScore: 89,
    contentLabel: 'discovery',
    totalSwipes: 8432,
    rightSwipes: 4892,
    saves: 156,
    orders: 156,
    earnings: 234.00,
    status: 'active',
    hasRecipe: true,
    missingItems: [],
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop',
    dish: 'Blueberry Stack',
    restaurant: 'Stacked Pancakes',
    hungerScore: 91,
    completenessScore: 30,
    metadataQualityStatus: 'basic',
    viralScore: 45,
    contentLabel: 'discovery',
    totalSwipes: 10234,
    rightSwipes: 6789,
    saves: 89,
    orders: 289,
    earnings: 433.50,
    status: 'active',
    hasRecipe: false,
    missingItems: ['calories', 'macros', 'dietary_tags', 'description', 'price'],
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop',
    dish: 'Brisket Platter',
    restaurant: 'Smoke & Fire BBQ',
    hungerScore: 97,
    completenessScore: 65,
    metadataQualityStatus: 'enhanced',
    viralScore: 234,
    contentLabel: 'trending',
    totalSwipes: 15632,
    rightSwipes: 11456,
    saves: 567,
    orders: 567,
    earnings: 850.50,
    status: 'active',
    hasRecipe: true,
    missingItems: ['health_category', 'ingredient_tags'],
  },
]

const MOCK_EARNINGS: EarningsBreakdown = {
  orders: 2031.00,
  tips: 127.50,
  recipes: 456.00,
  total: 2614.50
}

const MOCK_TIPS = [
  { id: '1', sender: '@foodielover', amount: 5.00, message: 'Proud to pay for this!', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', sender: '@hungry_sarah', amount: 3.00, message: 'Support!', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: '3', sender: '@stlfoodie', amount: 10.00, message: 'Best tacos ever!', createdAt: new Date(Date.now() - 259200000).toISOString() },
]

const OPTIMIZATION_TIPS: Record<string, { tip: string, points: number }> = {
  calories: { tip: 'Add calorie info → +10 points', points: 10 },
  macros: { tip: 'Add protein, carbs, fat → +10 points', points: 10 },
  dietary_tags: { tip: 'Add dietary tags → +10 points', points: 10 },
  description: { tip: 'Add a detailed description → +10 points', points: 10 },
  price: { tip: 'Add price info → +10 points', points: 10 },
  ingredient_tags: { tip: 'Add ingredient tags → +5 points', points: 5 },
  spice_level: { tip: 'Add spice level → +5 points', points: 5 },
  health_category: { tip: 'Add health category → +5 points', points: 5 },
  tags: { tip: 'Add more food tags → +15 points', points: 15 },
  location: { tip: 'Add restaurant location → +10 points', points: 10 },
}

const CONTENT_LABELS: Record<string, { label: string, color: string, bg: string }> = {
  discovery: { label: '🔍 Discovery', color: '#6B7280', bg: 'bg-gray-500/20' },
  trending: { label: '<Sparkle size={16} /> Trending', color: '#FF5722', bg: 'bg-[#FF5722]/20' },
  monetized: { label: '<Dollar size={24} /> Monetized', color: '#10B981', bg: 'bg-[#10B981]/20' },
  verified_kitchen: { label: '<CheckLine size={14} /> Verified Kitchen', color: '#FFD700', bg: 'bg-[#FFD700]/20' },
}

const ROLE_INFO: Record<string, { label: string, canSell: boolean, canTips: boolean, canRecipes: boolean }> = {
  eater: { label: '<Fork size={20} /> Eater', canSell: false, canTips: false, canRecipes: false },
  scout: { label: '👀 Scout', canSell: false, canTips: true, canRecipes: false },
  home_creator: { label: '🏠 Home Creator', canSell: false, canTips: true, canRecipes: true },
  cottage_creator: { label: '🏡 Cottage Creator', canSell: true, canTips: true, canRecipes: true },
  verified_creator: { label: '<CheckLine size={14} /> Verified Creator', canSell: true, canTips: true, canRecipes: true },
  restaurant: { label: '🏪 Restaurant', canSell: true, canTips: false, canRecipes: false },
}

export default function CreatorDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [photos] = useState<Photo[]>(MOCK_PHOTOS)
  const [role] = useState<string>('home_creator')

  const totalEarnings = photos.reduce((sum, p) => sum + p.earnings, 0)
  const totalOrders = photos.reduce((sum, p) => sum + p.orders, 0)
  const avgHungerScore = Math.round(photos.reduce((sum, p) => sum + p.hungerScore, 0) / photos.length)
  const avgCompleteness = Math.round(photos.reduce((sum, p) => sum + p.completenessScore, 0) / photos.length)
  const roleInfo = ROLE_INFO[role] || ROLE_INFO.eater

  // Calculate potential additional earnings
  const potentialAdditionalEarnings = photos.reduce((sum, photo) => {
    if (photo.completenessScore < 71) {
      const currentRate = photo.completenessScore >= 31 ? 0.90 : 0.85
      const topTierRate = 0.95
      const avgOrderValue = 20
      const commission = avgOrderValue * 0.10
      return sum + (photo.orders * commission * (topTierRate - currentRate))
    }
    return sum
  }, 0)

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="bg-[#1A1A2E] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF5722] rounded-full flex items-center justify-center text-2xl">
                <Camera size={16} />
              </div>
              <div>
                <h1 className="font-bold text-lg">Creator Dashboard</h1>
                <p className="text-gray-400 text-sm">{roleInfo.label}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/social" className="px-3 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20 transition">
                📱 Social
              </Link>
              <Link href="/creator/upload" className="px-4 py-2 bg-[#FF5722] rounded-full font-semibold hover:bg-[#e64a19] transition">
                + Upload
              </Link>
            </div>
          </div>

          {/* Role-specific actions */}
          {!roleInfo.canSell && (
            <div className="bg-gradient-to-r from-[#FFD700] to-[#FFA000] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0D0D0D]">Ready to sell food?</h3>
                  <p className="text-[#0D0D0D]/80 text-sm">Upgrade your account to start accepting orders</p>
                </div>
                <Link href="/creator/upgrade" className="px-4 py-2 bg-[#0D0D0D] text-[#FFD700] rounded-full font-bold text-sm hover:bg-[#1A1A1A] transition">
                  Start Selling →
                </Link>
              </div>
            </div>
          )}

          {/* Earnings Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#FFD700]">{formatCurrency(MOCK_EARNINGS.total)}</div>
              <div className="text-xs text-gray-300">Total Earnings</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{totalOrders}</div>
              <div className="text-xs text-gray-300">Orders</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-[#10B981]">{avgCompleteness}</div>
              <div className="text-xs text-gray-300">Avg Completeness</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{1247}</div>
              <div className="text-xs text-gray-300">Followers</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {['overview', 'photos', 'earnings', 'social', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 font-medium capitalize transition border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-[#FF5722] text-[#FF5722]'
                    : 'border-transparent text-[#6B7280] hover:text-[#1A1A2E]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Earnings Boost Banner */}
            {potentialAdditionalEarnings > 0 && (
              <div className="bg-gradient-to-r from-[#FFD700] to-[#FFA000] rounded-2xl p-6 text-[#0D0D0D]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold mb-1"><Dollar size={24} /> Unlock More Earnings</h2>
                    <p className="text-[#0D0D0D]/80 text-sm">
                      Add missing metadata to your photos and earn up to {formatCurrency(potentialAdditionalEarnings)} more!
                    </p>
                  </div>
                  <div className="text-3xl font-bold">
                    +{formatCurrency(potentialAdditionalEarnings)}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">This Month</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(MOCK_EARNINGS.orders)}</div>
                  <div className="text-sm text-[#6B7280]">Orders</div>
                </div>
                {roleInfo.canTips && (
                  <div className="text-center p-4 bg-[#F7F7F7] rounded-xl">
                    <div className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(MOCK_EARNINGS.tips)}</div>
                    <div className="text-sm text-[#6B7280]">Tips</div>
                  </div>
                )}
                {roleInfo.canRecipes && (
                  <div className="text-center p-4 bg-[#F7F7F7] rounded-xl">
                    <div className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(MOCK_EARNINGS.recipes)}</div>
                    <div className="text-sm text-[#6B7280]">Recipes</div>
                  </div>
                )}
                <div className="text-center p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A2E]">{avgHungerScore}</div>
                  <div className="text-sm text-[#6B7280]">Avg HungerScore™</div>
                </div>
              </div>
            </div>

            {/* Content Labels */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4"><Sparkle size={16} /> Content Performance</h2>
              <div className="space-y-3">
                {photos.map(photo => {
                  const tierBadge = getTierBadge(photo.completenessScore)
                  const contentInfo = CONTENT_LABELS[photo.contentLabel] || CONTENT_LABELS.discovery
                  return (
                    <div key={photo.id} className="flex items-center gap-4 p-3 bg-[#F7F7F7] rounded-xl">
                      <img src={photo.imageUrl} alt={photo.dish} className="w-14 h-14 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1A1A2E] truncate">{photo.dish}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${contentInfo.bg}`} style={{ color: contentInfo.color }}>
                            {contentInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#6B7280] mt-1">
                          <span><Flame size={14} /> {photo.viralScore} viral</span>
                          <span>❤️ {photo.saves} saves</span>
                          <span><Fork size={20} /> {photo.orders} orders</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#10B981]">{formatCurrency(photo.earnings)}</div>
                        <div className="text-xs text-[#6B7280]">earned</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1A1A2E]">Your Photos ({photos.length})</h2>
              <Link href="/creator/upload" className="px-4 py-2 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition">
                + Upload New
              </Link>
            </div>
            {photos.map(photo => {
              const tierBadge = getTierBadge(photo.completenessScore)
              const contentInfo = CONTENT_LABELS[photo.contentLabel] || CONTENT_LABELS.discovery
              return (
                <div key={photo.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-4">
                    <img src={photo.imageUrl} alt={photo.dish} className="w-24 h-24 object-cover rounded-xl" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-[#1A1A2E]">{photo.dish}</h3>
                          <p className="text-sm text-[#6B7280]">{photo.restaurant}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${contentInfo.bg}`} style={{ color: contentInfo.color }}>
                            {contentInfo.label}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${tierBadge.bgColor}`} style={{ color: tierBadge.color }}>
                            {tierBadge.label}
                          </span>
                          {photo.hasRecipe && (
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#10B981]/20 text-[#10B981]">
                              📖 Recipe
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Completeness Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#6B7280]">Completeness</span>
                          <span className="font-bold" style={{ color: tierBadge.color }}>{photo.completenessScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${photo.completenessScore}%`, backgroundColor: tierBadge.color }} />
                        </div>
                      </div>
                      
                      {/* Optimization Suggestions */}
                      {photo.missingItems && photo.missingItems.length > 0 && (
                        <div className="mt-2 p-2 bg-[#FFF7ED] rounded-lg border border-[#FFA000]/20">
                          <p className="text-xs font-semibold text-[#FF5722] mb-1"><Sparkle size={16} /> Improve:</p>
                          <div className="flex flex-wrap gap-1">
                            {photo.missingItems.slice(0, 3).map(item => {
                              const tip = OPTIMIZATION_TIPS[item]
                              return tip ? (
                                <span key={item} className="text-xs px-2 py-0.5 bg-white rounded text-[#6B7280]">
                                  +{tip.points}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Stats + Boost */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                          <div>
                            <div className="font-bold text-[#1A1A2E]">{photo.totalSwipes.toLocaleString()}</div>
                            <div className="text-[#6B7280]">Views</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#10B981]">{Math.round(photo.rightSwipes / photo.totalSwipes * 100)}%</div>
                            <div className="text-[#6B7280]">Right</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#FF5722]">{photo.orders}</div>
                            <div className="text-[#6B7280]">Orders</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#FFD700]">{formatCurrency(photo.earnings)}</div>
                            <div className="text-[#6B7280]">Earned</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const amount = photo.orders > 5 ? 'trending' : 'featured'
                            fetch('/api/checkout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ creatorId: 'current-user', promotion: amount, photoId: photo.id }),
                            }).then(r => r.json()).then(d => {
                              if (d.url) window.location.href = d.url
                              else alert('Checkout not ready yet — add Stripe keys to enable')
                            }).catch(() => alert('Checkout not ready yet'))
                          }}
                          className="ml-3 px-3 py-1.5 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-[#0D0D0D] rounded-full text-xs font-bold hover:opacity-90 transition"
                        >
                          ⭐ Boost
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {/* Available Balance */}
            <div className="bg-[#1A1A2E] rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Available for Payout</h2>
                  <p className="text-gray-400 text-sm">Next payout: April 15, 2026</p>
                </div>
                <div className="text-4xl font-bold text-[#FFD700]">{formatCurrency(MOCK_EARNINGS.total * 0.7)}</div>
              </div>
              <button className="w-full py-3 bg-[#10B981] text-white rounded-xl font-bold hover:bg-[#059669] transition">
                Request Payout
              </button>
            </div>

            {/* Earnings Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4"><Dollar size={24} /> Earnings Breakdown</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF5722]/20 rounded-full flex items-center justify-center"><Fork size={20} /></div>
                    <div>
                      <div className="font-medium text-[#1A1A2E]">Order Commission</div>
                      <div className="text-xs text-[#6B7280]">{MOCK_EARNINGS.orders > 0 ? '85-95% payout rate' : 'No orders yet'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#1A1A2E]">{formatCurrency(MOCK_EARNINGS.orders)}</div>
                  </div>
                </div>

                {roleInfo.canTips && (
                  <div className="flex items-center justify-between p-4 bg-[#F7F7F7] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FFD700]/20 rounded-full flex items-center justify-center">💝</div>
                      <div>
                        <div className="font-medium text-[#1A1A2E]">Tips Received</div>
                        <div className="text-xs text-[#6B7280]">100% to you (no platform fee)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#1A1A2E]">{formatCurrency(MOCK_EARNINGS.tips)}</div>
                    </div>
                  </div>
                )}

                {roleInfo.canRecipes && (
                  <div className="flex items-center justify-between p-4 bg-[#F7F7F7] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#10B981]/20 rounded-full flex items-center justify-center">📖</div>
                      <div>
                        <div className="font-medium text-[#1A1A2E]">Recipe Sales</div>
                        <div className="text-xs text-[#6B7280]">80-90% payout rate</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#1A1A2E]">{formatCurrency(MOCK_EARNINGS.recipes)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tips Received (if applicable) */}
            {roleInfo.canTips && MOCK_TIPS.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">💝 Recent Tips</h2>
                <div className="space-y-3">
                  {MOCK_TIPS.map(tip => (
                    <div key={tip.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="font-medium text-[#1A1A2E]">{tip.sender}</span>
                        <p className="text-xs text-[#6B7280]">{tip.message || 'Support!'}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#10B981]">+{formatCurrency(tip.amount)}</div>
                        <div className="text-xs text-[#6B7280]">{formatTime(tip.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payout Tiers */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4"><Sparkle size={16} /> Payout Tiers</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#F7F7F7] rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="font-medium text-[#1A1A2E]">Basic (0-30 completeness)</span>
                  </div>
                  <span className="font-bold text-[#6B7280]">85% payout</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F7F7F7] rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="font-medium text-[#1A1A2E]">Enhanced (31-70 completeness)</span>
                  </div>
                  <span className="font-bold text-[#10B981]">90% payout</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FFD700]/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
                    <span className="font-medium text-[#1A1A2E]">Top Earning (71-100 completeness)</span>
                  </div>
                  <span className="font-bold text-[#FFD700]">95% payout</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            {/* Followers */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1A1A2E]">👥 Followers</h2>
                <Link href="/creator/followers" className="text-sm text-[#FF5722]">See all →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A2E]">1,247</div>
                  <div className="text-sm text-[#6B7280]">Followers</div>
                </div>
                <div className="p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A2E]">89</div>
                  <div className="text-sm text-[#6B7280]">Following</div>
                </div>
                <div className="p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A2E]">34</div>
                  <div className="text-sm text-[#6B7280]">Posts</div>
                </div>
              </div>
            </div>

            {/* Engagement */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4"><Sparkle size={16} /> Engagement</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#10B981]">4.2%</div>
                  <div className="text-sm text-[#6B7280]">Avg Engagement</div>
                </div>
                <div className="text-center p-4 bg-[#F7F7F7] rounded-xl">
                  <div className="text-2xl font-bold text-[#FF5722]">2.3x</div>
                  <div className="text-sm text-[#6B7280]">Avg Orders/View</div>
                </div>
              </div>
            </div>

            {/* Post a Food Mood */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">💭 Share Your Food Mood</h2>
              <Link href="/social" className="block w-full py-3 bg-[#FF5722] text-white rounded-xl font-semibold text-center hover:bg-[#e64a19] transition">
                Go to Social Feed →
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Role & Upgrade */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">🏷️ Account Type</h2>
              <div className="flex items-center justify-between p-4 bg-[#F7F7F7] rounded-xl mb-4">
                <div>
                  <div className="font-bold text-[#1A1A2E]">{roleInfo.label}</div>
                  <div className="text-sm text-[#6B7280]">
                    {roleInfo.canSell ? 'Can sell food directly' : roleInfo.canRecipes ? 'Can sell recipes & receive tips' : 'Limited to discovery'}
                  </div>
                </div>
                <span className="text-2xl">🏷️</span>
              </div>
              {!roleInfo.canSell && (
                <Link href="/creator/upgrade" className="block w-full py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-[#0D0D0D] rounded-xl font-bold text-center hover:opacity-90 transition">
                  🚀 Upgrade to Sell Food
                </Link>
              )}
            </div>

            {/* Profile Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4"><Gear size={22} /> Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-1">Username</label>
                  <input type="text" defaultValue="@stlfoodie" className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5722]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-1">Email</label>
                  <input type="email" defaultValue="stlfoodie@email.com" className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5722]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-1">Bio</label>
                  <textarea defaultValue="Food lover sharing my favorite dishes!" rows={3} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5722] resize-none" />
                </div>
                <button className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#e64a19] transition">
                  Save Changes
                </button>
              </div>
            </div>

            {/* Payout Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">💳 Payout Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-1">Payout Method</label>
                  <select className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5722]">
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-1">Minimum Payout</label>
                  <input type="text" defaultValue="$10.00" disabled className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">📋 Compliance</h2>
              <div className="flex items-center gap-3 p-4 bg-[#10B981]/10 rounded-xl border border-[#10B981]/20">
                <CheckLine size={16} />
                <span className="text-sm text-[#1A1A2E]">You have agreed to follow local food laws</span>
              </div>
              <p className="text-xs text-[#6B7280] mt-3">
                By using HungerSwipes, you agree to comply with all applicable food safety laws and regulations in your jurisdiction.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
