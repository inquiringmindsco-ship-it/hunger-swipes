'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-fetch'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { safeNextRoute } from '@/lib/auth-routes'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [next, setNext] = useState('/swipe')
  const [refSellerId, setRefSellerId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
    if (params.get('mode') === 'recovery') setMode('recovery')
    const requestedNext = params.get('next')
    if (requestedNext) {
      const safeNext = safeNextRoute(requestedNext)
      setNext(safeNext)
      const ref = new URLSearchParams(safeNext.split('?')[1]).get('ref')
      if (ref) setRefSellerId(ref)
    }
    const authError = params.get('error')
    if (authError) {
      const readable = authError === 'auth_not_configured'
        ? 'Authentication is temporarily unavailable.'
        : authError === 'session_expired'
          ? 'That sign-in link or session has expired. Please sign in again.'
          : decodeURIComponent(authError)
      setError(readable)
    }
    if (params.get('message') === 'password_updated') setMessage('Your password was updated. Sign in with your new password.')
    const directRef = params.get('ref')
    if (directRef) setRefSellerId(directRef)
  }, [])

  const recordReferral = async (eventType: 'signup', sellerId: string) => {
    try {
      await authFetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: sellerId, event_type: eventType }),
      })
    } catch {
      // Non-blocking
    }
  }

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
      const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`

      if (mode === 'recovery') {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/reset')}`,
        })
        if (recoveryError) throw recoveryError
        setMessage('Check your email for a secure password-reset link.')
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: next.startsWith('/join') ? 'seller' : 'eater' },
            emailRedirectTo,
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Check your email to confirm your account, then sign in to continue.')
        } else {
          if (refSellerId) await recordReferral('signup', refSellerId)
          router.push(next)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        if (refSellerId) await recordReferral('signup', refSellerId)
        router.push(next)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hs-ink flex flex-col text-hs-cream">
      <header className="px-4 py-4 max-w-md mx-auto w-full safe-top">
        <Link href="/swipe" className="inline-flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-base tracking-tight">Hunger Swipes</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-2 pb-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </h1>
            <p className="text-hs-gray text-sm">
              {mode === 'login'
                ? 'Sign in to save food and manage your listing.'
                : mode === 'signup' ? 'One account to swipe through food and list your own.' : 'We’ll send a secure recovery link to your email.'}
            </p>
          </div>

          <div className="bg-hs-charcoal rounded-[1.5rem] p-6 border border-white/[0.06]">
            {error && (
              <div className="mb-4 p-3 bg-hs-red/10 border border-hs-red/30 rounded-xl text-hs-red text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 bg-hs-success/10 border border-hs-success/30 rounded-xl text-hs-success text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-hs-gold mb-2 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-hs-soft border border-white/[0.08] rounded-2xl text-hs-cream placeholder-hs-muted focus:outline-none focus:border-hs-gold/50 transition"
                    required={mode === 'signup'}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-hs-gold mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-hs-soft border border-white/[0.08] rounded-2xl text-hs-cream placeholder-hs-muted focus:outline-none focus:border-hs-gold/50 transition"
                  required
                />
              </div>

              {mode !== 'recovery' && <div>
                <label className="block text-xs font-semibold text-hs-gold mb-2 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-hs-soft border border-white/[0.08] rounded-2xl text-hs-cream placeholder-hs-muted focus:outline-none focus:border-hs-gold/50 transition"
                  required
                  minLength={8}
                />
              </div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-base hover:bg-hs-gold-light transition disabled:opacity-50"
              >
                {loading
                  ? mode === 'login'
                    ? 'Signing in...'
                    : mode === 'signup' ? 'Creating account...' : 'Sending recovery link...'
                  : mode === 'login'
                    ? 'Sign In'
                    : mode === 'signup' ? 'Create Free Account' : 'Send Recovery Link'}
              </button>
            </form>

            <p className="mt-5 text-center text-hs-gray text-sm">
              {mode === 'login' ? (
                <>
                  <button onClick={() => setMode('recovery')} className="text-hs-gold font-semibold hover:text-hs-gold-light transition">Forgot password?</button>
                  <span className="mx-2">•</span>No account yet?{' '}
                  <button onClick={() => setMode('signup')} className="text-hs-gold font-semibold hover:text-hs-gold-light transition">
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Already on HungerSwipes?' : 'Remembered your password?'}{' '}
                  <button onClick={() => setMode('login')} className="text-hs-gold font-semibold hover:text-hs-gold-light transition">
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
