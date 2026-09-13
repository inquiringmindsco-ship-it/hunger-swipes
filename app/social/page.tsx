'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Fork, Comment, ForkFlame } from '@/app/components/HwIcon'
import { ArrowLeft, Heart, UserRound } from 'lucide-react'

interface FoodMood {
  id: string
  content: string
  like_count: number
  comment_count: number
  created_at: string
  user: {
    username: string
    avatar_url?: string
  }
}

export default function SocialFeedPage() {
  const [moods, setMoods] = useState<FoodMood[]>([])
  const [loading, setLoading] = useState(true)
  const [newMood, setNewMood] = useState('')
  const [posting, setPosting] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('hungerswipes_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    fetchMoods()
  }, [])

  const fetchMoods = async () => {
    try {
      const res = await fetch('/api/social/mood')
      const data = await res.json()
      if (data.moods) {
        setMoods(data.moods)
      }
    } catch (err) {
      console.error('Failed to fetch moods')
    } finally {
      setLoading(false)
    }
  }

  const postMood = async () => {
    if (!newMood.trim() || !user?.id) return
    
    setPosting(true)
    try {
      const res = await fetch('/api/social/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          content: newMood.trim()
        })
      })
      const data = await res.json()
      if (data.mood) {
        setMoods([data.mood, ...moods])
        setNewMood('')
      }
    } catch (err) {
      console.error('Failed to post mood')
    } finally {
      setPosting(false)
    }
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/swipe" className="inline-flex min-h-11 items-center gap-1 text-gray-400">
            <ArrowLeft size={17} aria-hidden="true" /> Back
          </Link>
          <h1 className="font-bold text-white">Food Moods</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Post Mood */}
        {user && (
          <div className="mb-6">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-gray-400 text-sm mb-2">What are you craving?</p>
              <textarea
                value={newMood}
                onChange={e => setNewMood(e.target.value)}
                placeholder="I'm in the mood for..."
                maxLength={280}
                rows={2}
                className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{newMood.length}/280</span>
                <button
                  onClick={postMood}
                  disabled={!newMood.trim() || posting}
                  className="px-4 py-2 bg-[#FF5722] text-white rounded-full text-sm font-semibold hover:bg-[#e64a19] transition disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Moods Feed */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : moods.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4"><Fork size={20} /></div>
            <p className="text-gray-400">No moods yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {moods.map(mood => (
              <div key={mood.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[#FF5722]/20 flex items-center justify-center">
                    <UserRound size={20} className="text-[#FF5722]" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-white">{mood.user.username}</span>
                    <span className="text-gray-500 text-sm ml-2">{timeAgo(mood.created_at)}</span>
                  </div>
                </div>
                <p className="text-white mb-3">{mood.content}</p>
                <div className="flex gap-4 text-gray-500 text-sm">
                  <button aria-label={`Like post by ${mood.user.username}`} className="flex min-h-11 items-center gap-1 hover:text-[#FF5722] transition">
                    <Heart size={18} aria-hidden="true" />
                    <span>{mood.like_count}</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-[#FF5722] transition">
                    <span><Comment size={22} /></span>
                    <span>{mood.comment_count}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
