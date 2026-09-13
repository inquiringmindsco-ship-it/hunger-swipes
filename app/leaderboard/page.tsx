'use client'

import Link from 'next/link'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, SettingsGear, CheckBold, StarFilled, ChatBubble, DollarSign } from '@/app/components/HwIcon'

interface Creator {
  rank: number
  username: string
  avatar: string
  totalEarnings: number
  monthlyEarnings: number
  totalOrders: number
  topPhoto: string
  hungerScore: number
}

const MOCK_LEADERBOARD: Creator[] = [
  {
    rank: 1,
    username: '@meatlovers_mike',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    totalEarnings: 12847.50,
    monthlyEarnings: 2340.00,
    totalOrders: 3421,
    topPhoto: 'Brisket Platter',
    hungerScore: 97,
  },
  {
    rank: 2,
    username: '@stlfoodie',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    totalEarnings: 9845.00,
    monthlyEarnings: 1890.50,
    totalOrders: 2654,
    topPhoto: 'Margherita Pizza',
    hungerScore: 94,
  },
  {
    rank: 3,
    username: '@sushi_sensei',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    totalEarnings: 8723.25,
    monthlyEarnings: 1654.00,
    totalOrders: 2187,
    topPhoto: 'Dragon Roll',
    hungerScore: 96,
  },
  {
    rank: 4,
    username: '@brunch_king',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    totalEarnings: 6542.00,
    monthlyEarnings: 1120.75,
    totalOrders: 1876,
    topPhoto: 'Blueberry Stack',
    hungerScore: 91,
  },
  {
    rank: 5,
    username: '@taco_tuesday',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    totalEarnings: 5430.50,
    monthlyEarnings: 987.25,
    totalOrders: 1543,
    topPhoto: 'Carnitas Tacos',
    hungerScore: 93,
  },
]

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="bg-[#1A1A2E] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="HungerSwipes" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-bold text-lg">HungerSwipes</span>
            </Link>
            <Link href="/creator" className="text-sm font-semibold text-[#FFD700]">
              Join as Creator →
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2"><Trophy size={20} /> Creator Leaderboard</h1>
          <p className="text-gray-400">Top food photographers earning from their shots</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Top 3 Podium */}
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-gray-300 mb-2">
              <img src={MOCK_LEADERBOARD[1].avatar} alt={MOCK_LEADERBOARD[1].username} className="w-full h-full object-cover" />
            </div>
            <div className="bg-gray-200 text-gray-700 font-bold px-3 py-1 rounded-full text-sm mb-1">2nd</div>
            <p className="font-bold text-[#1A1A2E] text-sm">{MOCK_LEADERBOARD[1].username}</p>
            <p className="text-gray-600 text-xs">${MOCK_LEADERBOARD[1].monthlyEarnings.toLocaleString()}/mo</p>
          </div>

          {/* 1st Place */}
          <div className="text-center">
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-[#FFD700] mb-2 shadow-lg shadow-[#FFD700]/30">
              <img src={MOCK_LEADERBOARD[0].avatar} alt={MOCK_LEADERBOARD[0].username} className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#FFD700] text-[#1A1A2E] font-bold px-4 py-1 rounded-full text-sm mb-1"><Trophy size={20} /> 1st</div>
            <p className="font-bold text-[#1A1A2E]">{MOCK_LEADERBOARD[0].username}</p>
            <p className="text-[#FF5722] font-bold">${MOCK_LEADERBOARD[0].monthlyEarnings.toLocaleString()}/mo</p>
          </div>

          {/* 3rd Place */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-amber-600 mb-2">
              <img src={MOCK_LEADERBOARD[2].avatar} alt={MOCK_LEADERBOARD[2].username} className="w-full h-full object-cover" />
            </div>
            <div className="bg-amber-600 text-white font-bold px-3 py-1 rounded-full text-sm mb-1">3rd</div>
            <p className="font-bold text-[#1A1A2E] text-sm">{MOCK_LEADERBOARD[2].username}</p>
            <p className="text-gray-600 text-xs">${MOCK_LEADERBOARD[2].monthlyEarnings.toLocaleString()}/mo</p>
          </div>
        </div>

        {/* Full Rankings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-bold text-[#1A1A2E]">All Rankings</h2>
          </div>
          {MOCK_LEADERBOARD.map((creator, index) => (
            <div key={creator.rank} className="flex items-center gap-4 px-6 py-4 border-b last:border-0 hover:bg-gray-50 transition">
              <div className="w-8 text-center font-bold text-gray-600">#{creator.rank}</div>
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#1A1A2E]">{creator.username}</p>
                <p className="text-sm text-gray-600">{creator.totalOrders.toLocaleString()} orders · {creator.topPhoto}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#10B981]">${creator.monthlyEarnings.toLocaleString()}</p>
                <p className="text-xs text-gray-600">this month</p>
              </div>
              <div className="bg-[#FFD700]/20 px-2 py-1 rounded-full">
                <span className="text-xs font-bold text-[#1A1A2E]">{creator.hungerScore}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Think you can make the leaderboard?</p>
          <Link href="/auth" className="inline-block px-8 py-4 bg-[#FF5722] text-white rounded-full font-bold hover:bg-[#e64a19] transition">
            Start Earning Today
          </Link>
        </div>
      </main>
    </div>
  )
}
