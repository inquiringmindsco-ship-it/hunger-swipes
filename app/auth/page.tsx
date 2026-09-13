'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams?.get('next')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
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
            data: { full_name: fullName, role: safeNext.startsWith('/join') ? 'seller' : 'eater' },
            emailRedirectTo,
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Check your email to confirm your account, then sign in to continue.')
        } else {
          router.push(safeNext)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.push(safeNext)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col text-white">
      <header className="px-4 py-5 max-w-md mx-auto w-full flex items-center justify-between">
        <Link href="/swipe" className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight">HungerSwipes</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-4 pb-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black mb-2">
              {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === 'login'
                ? 'Sign in to swipe, save dishes, and manage your food listing.'
                : 'One account to swipe through food and list your own.'}
            </p>
          </div>

          <div className="bg-[#111] rounded-3xl p-6 border border-white/5">
            {error && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF5722] transition"
                    required={mode === 'signup'}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF5722] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF5722] transition"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#FF5722] text-white rounded-xl font-bold text-base hover:bg-[#E04A1B] transition disabled:opacity-50"
              >
                {loading
                  ? mode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Free Account'}
              </button>
            </form>

            <p className="mt-5 text-center text-gray-500 text-sm">
              {mode === 'login' ? (
                <>
                  No account yet?{' '}
                  <button onClick={() => setMode('signup')} className="text-[#FF5722] font-semibold">
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already on HungerSwipes?{' '}
                  <button onClick={() => setMode('login')} className="text-[#FF5722] font-semibold">
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
