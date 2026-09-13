'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, SettingsGear, CheckBold, StarFilled, ChatBubble, DollarSign } from '@/app/components/HwIcon'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName,
            username,
            role: 'eater', // Always start as eater
          })
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Signup failed')
          setLoading(false)
          return
        }

        // Store user in localStorage for demo
        const user = data.mock
          ? {
              id: data.user?.id || 'demo-' + Date.now(),
              email: email,
              full_name: fullName,
              username: username || email.split('@')[0],
              role: 'eater',
            }
          : data.user

        localStorage.setItem('hungerswipes_user', JSON.stringify(user))
        router.push('/swipe')
      } else {
        // Demo login — any credentials work
        const mockUser = {
          id: 'demo-' + Date.now(),
          email,
          full_name: fullName || 'Hungry Eater',
          username: username || email.split('@')[0],
          role: 'eater',
        }
        localStorage.setItem('hungerswipes_user', JSON.stringify(mockUser))
        router.push('/swipe')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="px-4 py-5 flex items-center justify-between max-w-md mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="HungerSwipes" className="h-9 w-9 rounded-xl object-cover" />
          <span className="font-black text-lg text-white tracking-tight">HungerSwipes</span>
        </Link>
        <Link href="/" className="text-gray-500 text-sm hover:text-white transition">
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-4 pb-10">
        <div className="w-full max-w-md">

          {/* What you get pitch */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
              {mode === 'login' ? 'Welcome back.' : 'One account. Everything.'}
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              {mode === 'login'
                ? 'Sign in to swipe, save matches, and earn.'
                : 'Sign up once. Swipe to discover food. Upgrade to creator to earn from your photos — anytime.'}
            </p>
          </div>

          {/* Feature pills */}
          {mode === 'signup' && (
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { icon: <ForkFlame size={12} />, label: 'Swipe & discover' },
                { icon: <Heart size={12} />, label: 'Save matches' },
                { icon: <Dollar size={12} />, label: 'Earn per order' },
                { icon: <Star size={12} />, label: 'Creator tools' },
              ].map(pill => (
                <div key={pill.label} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-600">
                  {pill.icon}
                  {pill.label}
                </div>
              ))}
            </div>
          )}

          {/* Form Card */}
          <div className="bg-[#111] rounded-3xl p-6 border border-white/5">
            {error && (
              <div className="mb-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl text-[#EF4444] text-sm flex items-center gap-2">
                <XMark size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF6A00] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        placeholder="yourname"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF6A00] transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF6A00] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF6A00] transition"
                  required
                  minLength={8}
                />
              </div>

              {mode === 'signup' && (
                <div className="flex items-start gap-3 pt-1">
                  <input type="checkbox" className="mt-0.5 accent-[#FF6A00] flex-shrink-0" required />
                  <span className="text-xs text-gray-600">
                    I agree to the{' '}
                    <Link href="/terms" className="text-[#FF6A00]">Terms</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-[#FF6A00]">Privacy Policy</Link>
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#FF6A00] text-white rounded-xl font-bold text-base hover:bg-[#E05A00] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Free Account'
                )}
              </button>
            </form>

            {/* Social login */}
            <div className="mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/8" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[#111] text-xs text-gray-600">or continue with</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-white text-sm">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
                  <svg className="w-4 h-4" fill="#fff" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  <span className="font-medium text-white text-sm">GitHub</span>
                </button>
              </div>
            </div>

            <p className="mt-5 text-center text-gray-500 text-sm">
              {mode === 'login' ? (
                <>
                  No account yet?{' '}
                  <button onClick={() => setMode('signup')} className="text-[#FF6A00] font-semibold">
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already on HungerSwipes?{' '}
                  <button onClick={() => setMode('login')} className="text-[#FF6A00] font-semibold">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
