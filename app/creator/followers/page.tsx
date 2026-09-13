'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Camera, Search } from '@/app/components/HwIcon'

const MOCK_FOLLOWERS = [
  { id: '1', username: '@stlfoodie', name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop', followers: 342, following: 120, posts: 28 },
  { id: '2', username: '@healthyeats_sarah', name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', followers: 891, following: 234, posts: 56 },
  { id: '3', username: '@brunch_king', name: 'Marcus Thompson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', followers: 1204, following: 445, posts: 89 },
  { id: '4', username: '@meatlovers_mike', name: 'Mike Johnson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', followers: 567, following: 198, posts: 34 },
  { id: '5', username: '@sushi_sensei', name: 'Yuki Tanaka', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', followers: 2341, following: 512, posts: 112 },
  { id: '6', username: '@taco_tuesday', name: 'Maria Garcia', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', followers: 445, following: 321, posts: 67 },
  { id: '7', username: '@veggielover', name: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop', followers: 789, following: 267, posts: 45 },
  { id: '8', username: '@dessert_dreams', name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop', followers: 1567, following: 389, posts: 98 },
]

export default function FollowersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [followers] = useState(MOCK_FOLLOWERS)

  const filtered = followers.filter(f =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="bg-[#1A1A2E] text-white sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/creator" aria-label="Back to creator profile" className="inline-flex min-h-11 min-w-11 items-center justify-center text-white/70 hover:text-white transition">
              <ArrowLeft size={22} aria-hidden="true" />
            </Link>
            <h1 className="font-bold text-lg">Followers</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search followers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm text-gray-600 mb-4">{followers.length} followers</p>

        <div className="space-y-3">
          {filtered.map(follower => (
            <div key={follower.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <img
                src={follower.avatar}
                alt={follower.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1A1A2E] text-sm">{follower.name}</p>
                <p className="text-gray-600 text-xs">{follower.username}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {follower.followers.toLocaleString()} followers · {follower.posts} posts
                </p>
              </div>
              <button className="px-3 py-1.5 bg-[#FF5722] text-white text-xs font-semibold rounded-full hover:bg-[#e64a19] transition">
                Follow
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No followers found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search</p>
          </div>
        )}
      </main>
    </div>
  )
}
