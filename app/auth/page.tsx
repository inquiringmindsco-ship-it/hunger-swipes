'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, SettingsGear, CheckBold, StarFilled, ChatBubble, DollarSign } from '@/app/components/HwIcon'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams?.get('next')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error('Authentication is not configured')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL is not configured')
      }
      const safeNext = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/swipe'
      const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, username, role: safeNext.startsWith('/join') ? 'seller' : 'eater' },
          emailRedirectTo,
        },
      })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Check your email to confirm your account, then sign in to continue.')
        } else {
          localStorage.setItem('hungerswipes_user', JSON.stringify(data.user))
          router.push(safeNext)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        localStorage.setItem('hungerswipes_user', JSON.stringify(data.user))
        router.push(safeNext)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
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
            {message && (
              <div className="mb-4 p-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl text-[#10B981] text-sm">
                {message}
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

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
