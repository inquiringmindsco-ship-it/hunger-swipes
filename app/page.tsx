'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Dollar, MapPin,
  Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight,
  ArrowRight, Note, Crown, Comment, Sparkle, Plate
} from '@/app/components/HwIcon'
import { getEaterId } from '@/lib/eater-id'

// ============================================================
// SPLASH SCREEN — animated logo on load
// ============================================================
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 1400)
    const t3 = setTimeout(() => { setPhase('done'); onDone() }, 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#C8102E] transition-opacity duration-500 ${phase === 'out' || phase === 'done' ? 'opacity-0' : 'opacity-100'}`}>
      <img
        src="/logo.png"
        alt="HungerSwipes"
        className="w-64 h-64 object-contain transition-all duration-700"
        style={{
          transform: phase === 'in' ? 'scale(0.7)' : phase === 'hold' ? 'scale(1)' : 'scale(1.05)',
          opacity: phase === 'in' ? 0 : 1,
        }}
      />
      <div className="mt-8 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/70"
            style={{
              animation: phase === 'hold' ? `pulse 1s ease-in-out infinite` : 'none',
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

// ============================================================
// BOTTOM TAB BAR — native app feel
// ============================================================
type Tab = 'home' | 'discover' | 'upload' | 'matches' | 'profile'

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <ForkFlame size={22} />, label: 'Home' },
    { id: 'discover', icon: <Flame size={22} />, label: 'Discover' },
    { id: 'upload', icon: <Upload size={22} />, label: 'Post' },
    { id: 'matches', icon: <Heart size={22} />, label: 'Matches' },
    { id: 'profile', icon: <Star size={22} />, label: 'Profile' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/10 z-50 safe-bottom">
      <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              active === tab.id
                ? 'text-[#FF6A00]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className={`rounded-xl p-1.5 transition-colors ${
              active === tab.id ? 'bg-[#FF6A00]/15' : ''
            }`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// HOME TAB
// ============================================================
function HomeTab() {
  const stats = [
    { val: '$847K', label: 'Paid to Creators', color: '#FFD500' },
    { val: '156K', label: 'Orders Driven', color: '#FF6A00' },
    { val: '12K+', label: 'Photos', color: '#FF6A00' },
    { val: '4.9★', label: 'Rating', color: '#10B981' },
  ]

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <img src="/logo.png" alt="HungerSwipes" className="h-9 w-9 rounded-xl object-cover" />
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="text-gray-600 hover:text-white transition">
            <Trophy size={20} />
          </Link>
          <Link href="/auth" className="px-4 py-1.5 bg-[#FF6A00] text-white rounded-full font-bold text-xs">
            Sign In
          </Link>
        </div>
      </div>

      {/* Hero card */}
      <div className="mx-4 mb-5 rounded-3xl overflow-hidden bg-[#141414] border border-white/5">
        <div className="h-32 bg-gradient-to-br from-[#FF6A00]/30 to-[#FFD500]/10 flex items-center px-5">
          <div className="flex-1">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Your next meal</p>
            <h2 className="text-2xl font-black text-white leading-tight">Swipe. Order.<br/>Earn forever.</h2>
          </div>
          <div className="text-5xl"><ForkFlame size={64} /></div>
        </div>
        <div className="p-4">
          <Link
            href="/swipe"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#FF6A00] text-white rounded-2xl font-bold text-base hover:bg-[#E05A00] transition"
          >
            Start Swiping <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div key={s.label} className="bg-[#111] rounded-2xl p-3 text-center border border-white/5">
              <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-gray-500 text-[10px] font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-2">Quick Start</p>
        {[
          { icon: <Camera size={18} />, label: 'Browse Food', desc: 'Discover dishes to order', href: '/swipe', color: '#FF6A00' },
          { icon: <ForkFlame size={18} />, label: 'Nearby Vendors', desc: 'Find discounts near you', href: '/nearby', color: '#FFD500' },
          { icon: <Dollar size={18} />, label: 'Earn as Creator', desc: 'Get paid for your photos', href: '/auth', color: '#10B981' },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 bg-[#111] rounded-2xl p-4 border border-white/5 hover:bg-[#141414] transition"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '20', color: item.color }}>
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-white">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
            <ArrowRight size={16} style={{ color: '#555' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// DISCOVER TAB
// ============================================================
function DiscoverTab() {
  return (
    <div className="pb-24">
      <div className="px-4 py-3">
        <h1 className="text-2xl font-black">Discover</h1>
        <p className="text-gray-500 text-sm">Find food you'll love</p>
      </div>
      <div className="px-4 space-y-3">
        {[
          { label: 'Swipe on Food', desc: 'Tinder for food. Find what to eat.', icon: <ForkFlame size={20} />, href: '/swipe', color: '#FF6A00' },
          { label: 'Nearby Vendors', desc: 'Vendors near you with discount codes', icon: <MapPin size={20} />, href: '/nearby', color: '#FFD500' },
          { label: 'All Vendors', desc: 'Browse all restaurants & food stalls', icon: <Plate size={20} />, href: '/vendors', color: '#FF6A00' },
          { label: 'Top Creators', desc: 'See who\'s earning the most', icon: <Trophy size={20} />, href: '/leaderboard', color: '#FFD500' },
          { label: 'Social Moods', desc: 'See what people are craving', icon: <Sparkle size={20} />, href: '/social', color: '#10B981' },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 bg-[#111] rounded-2xl p-4 border border-white/5 hover:bg-[#141414] transition"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: item.color + '20', color: item.color }}>
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-white">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
            <ArrowRight size={16} style={{ color: '#555' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// UPLOAD TAB
// ============================================================
function UploadTab() {
  return (
    <div className="pb-24">
      <div className="px-4 pt-3 pb-4">
        <h1 className="text-2xl font-black">Post & Earn</h1>
        <p className="text-gray-500 text-sm">Turn your food photos into income</p>
      </div>
      <div className="px-4 space-y-3">
        <div className="bg-gradient-to-br from-[#FFD500]/20 to-transparent rounded-3xl p-6 border border-[#FFD500]/20">
          <div className="flex items-center gap-2 mb-3">
            <Dollar size={24} style={{ color: '#FFD500' }} />
            <span className="font-black text-[#FFD500] text-lg">Earn per order</span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            Upload a food photo. Set your commission rate. Every time someone orders from it, you earn — forever.
          </p>
          <div className="flex gap-3 text-center">
            {[
              { label: '5%', sub: 'Basic' },
              { label: '10%', sub: 'Standard' },
              { label: '20%', sub: 'Max' },
            ].map(tier => (
              <div key={tier.label} className="flex-1 bg-black/30 rounded-xl py-2">
                <div className="text-[#FFD500] font-black text-lg">{tier.label}</div>
                <div className="text-gray-500 text-[10px]">{tier.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/auth"
          className="flex items-center gap-3 bg-[#FF6A00] rounded-2xl p-4 font-bold text-white justify-center hover:bg-[#E05A00] transition"
        >
          <Upload size={20} /> Start Posting
        </Link>

        <Link
          href="/creator"
          className="flex items-center gap-3 bg-[#111] rounded-2xl p-4 border border-white/5 hover:bg-[#141414] transition"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/20 flex items-center justify-center" style={{ color: '#FF6A00' }}>
            <Camera size={18} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-white">Creator Dashboard</p>
            <p className="text-xs text-gray-500">View your stats & earnings</p>
          </div>
          <ArrowRight size={16} style={{ color: '#555' }} />
        </Link>
      </div>
    </div>
  )
}

// ============================================================
// MATCHES TAB
// ============================================================
function MatchesTab() {
  const [matches, setMatches] = useState<any[]>([])

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const eaterId = getEaterId()
        const res = await fetch(`/api/saves?eaterId=${encodeURIComponent(eaterId)}`)
        const data = await res.json()
        if (!res.ok) return
        setMatches((data.saved || []).map((item: any) => ({
          id: item.dish.id,
          imageUrl: item.dish.photo_url,
          dish: item.dish.name,
          restaurant: item.dish.seller.business_name,
        })))
      } catch {}
    }
    loadMatches()
  }, [])

  return (
    <div className="pb-24">
      <div className="px-4 pt-3 pb-4">
        <h1 className="text-2xl font-black">Matches</h1>
        <p className="text-gray-500 text-sm">{matches.length} saved — order or visit them</p>
      </div>

      {matches.length === 0 ? (
        <div className="px-4 text-center py-16">
          <div className="w-20 h-20 rounded-full bg-[#111] flex items-center justify-center mx-auto mb-4">
            <Heart size={36} style={{ opacity: 0.3 }} />
          </div>
          <p className="text-gray-600 font-medium mb-1">No matches yet</p>
          <p className="text-gray-600 text-sm mb-6">Swipe right on food you want to order</p>
          <Link href="/swipe" className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6A00] text-white rounded-full font-bold text-sm hover:bg-[#E05A00] transition">
            <ForkFlame size={16} /> Start Swiping
          </Link>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-2">
          {matches.slice(0, 6).map((m: any, i: number) => (
            <Link
              key={m.id || i}
              href={`/matches?photoId=${m.id}`}
              className="relative rounded-2xl overflow-hidden bg-[#111] border border-white/5 aspect-square"
            >
              <img src={m.imageUrl || m.image_url} alt={m.dish} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white font-bold text-xs truncate">{m.dish}</p>
                <p className="text-white/60 text-[10px] truncate">{m.restaurant}</p>
              </div>
              {m.hasDiscount && (
                <div className="absolute top-2 right-2 bg-[#FFD500] text-black text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {m.discountCode}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// PROFILE TAB
// ============================================================
function ProfileTab() {
  return (
    <div className="pb-24">
      <div className="px-4 pt-3 pb-4">
        <h1 className="text-2xl font-black">Profile</h1>
      </div>

      <div className="px-4 space-y-3">
        <div className="bg-[#111] rounded-3xl p-5 border border-white/5 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FF6A00]/20 flex items-center justify-center mx-auto mb-3">
            <ForkFlame size={40} />
          </div>
          <p className="text-white font-bold text-lg">Hungry Eater</p>
          <p className="text-gray-500 text-sm mb-4">Join to start earning</p>
          <Link href="/auth" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF6A00] text-white rounded-full font-bold text-sm hover:bg-[#E05A00] transition">
            Sign Up Free
          </Link>
        </div>

        {[
          { icon: <Star size={18} />, label: 'Leaderboard', href: '/leaderboard', color: '#FFD500' },
          { icon: <Note size={18} />, label: 'My Visits', href: '/visits', color: '#10B981' },
          { icon: <Heart size={18} />, label: 'Preferences', href: '/preferences', color: '#FF6A00' },
          { icon: <Grid size={18} />, label: 'Social Moods', href: '/social', color: '#FF6A00' },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 bg-[#111] rounded-2xl p-4 border border-white/5 hover:bg-[#141414] transition"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + '20', color: item.color }}>
              {item.icon}
            </div>
            <span className="flex-1 font-medium text-sm text-white">{item.label}</span>
            <ArrowRight size={14} style={{ color: '#555' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP SHELL
// ============================================================
export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [showSplash, setShowSplash] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile')

  useEffect(() => {
    setMounted(true)
    // Check if we've shown splash before
    const hasSeenSplash = sessionStorage.getItem('hungerswipes_splash')
    if (hasSeenSplash) {
      setShowSplash(false)
    }
    // Load saved view preference
    const savedView = localStorage.getItem('hungerswipes_view')
    if (savedView === 'desktop') setViewMode('desktop')
  }, [])

  function handleSplashDone() {
    sessionStorage.setItem('hungerswipes_splash', '1')
    setShowSplash(false)
  }

  function toggleView() {
    const next = viewMode === 'mobile' ? 'desktop' : 'mobile'
    setViewMode(next)
    localStorage.setItem('hungerswipes_view', next)
  }

  const tabs: Record<Tab, React.ReactNode> = {
    home: <HomeTab key="home" />,
    discover: <DiscoverTab key="discover" />,
    upload: <UploadTab key="upload" />,
    matches: <MatchesTab key="matches" />,
    profile: <ProfileTab key="profile" />,
  }

  return (
    <>
      {/* Desktop toggle */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2">
        <button
          onClick={toggleView}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur border border-white/15 rounded-full text-xs font-semibold text-gray-600 hover:text-white hover:bg-white/15 transition"
          title={viewMode === 'mobile' ? 'Switch to desktop view' : 'Switch to mobile view'}
        >
          {viewMode === 'mobile' ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              Desktop
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
              Mobile
            </>
          )}
        </button>
      </div>

      {/* App wrapper — mobile or desktop */}
      <div className={`min-h-screen bg-[#0A0A0A] text-white transition-all duration-300 ${
        viewMode === 'mobile'
          ? 'max-w-md mx-auto relative'
          : 'max-w-5xl mx-auto relative'
      }`}>
        {mounted && tabs[activeTab]}
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Splash overlay */}
      {showSplash && mounted && (
        <SplashScreen onDone={handleSplashDone} />
      )}
    </>
  )
}
