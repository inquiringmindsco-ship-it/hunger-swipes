'use client'

import { useEffect, Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-fetch'
import { safeNextRoute } from '@/lib/auth-routes'
import { BrandMark } from '@/app/components/icons/HungerIcons'

function CallbackContent() {
  const router = useRouter()
  const [started, setStarted] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [destination, setDestination] = useState('/swipe')

  useEffect(() => {
    if (started) return
    setStarted(true)

    const finish = async () => {
      try {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const code = params.get('code')
        const tokenHash = hashParams.get('token_hash')
        const next = safeNextRoute(params.get('next') || hashParams.get('next'))

        const supabase = getSupabase()
        if (!supabase) {
          router.replace('/auth?error=auth_not_configured')
          return
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Session exchange error:', error)
            router.replace(`/auth?error=${encodeURIComponent(error.message)}`)
            return
          }
        }

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
          if (error) {
            router.replace(`/auth?error=${encodeURIComponent(error.message)}`)
            return
          }
          window.history.replaceState(null, '', `/auth/callback?next=${encodeURIComponent(next)}`)
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.replace(`/auth?error=session_expired&next=${encodeURIComponent(next)}`)
          return
        }
        if (session.user) {
          // Record referral signup conversion if next URL has a ref
          const nextParams = new URLSearchParams(next.split('?')[1])
          const refSellerId = nextParams.get('ref')
          if (refSellerId) {
            try {
              await authFetch('/api/referrals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seller_id: refSellerId, event_type: 'signup' }),
              })
            } catch {
              // Non-blocking
            }
          }
        }

        setDestination(next)
        setConfirmed(true)
      } catch (err: any) {
        console.error('Callback error:', err)
        router.replace(`/auth?error=${encodeURIComponent(err.message || 'callback_failed')}`)
      }
    }

    finish()
  }, [started, router])

  if (confirmed) return (
    <div className="min-h-screen bg-hs-ink px-4 py-10 text-hs-cream">
      <main className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center">
        <section className="w-full rounded-[2rem] border border-white/[0.07] bg-hs-charcoal p-7 text-center shadow-card-lg">
          <BrandMark size={58} className="mx-auto" />
          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-hs-success/15 text-hs-success"><CheckCircle2 size={34} /></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-hs-gold">Welcome to Hunger Swipes</p>
          <h1 className="mt-2 text-3xl font-black">Your account is confirmed</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-hs-gray">You’re all set. Continue to the app, or close this page whenever you’re ready.</p>
          <Link href={destination} className="mt-7 flex min-h-14 w-full items-center justify-center rounded-2xl bg-hs-gold px-5 font-black text-hs-black">Continue to Hunger Swipes</Link>
          {destination !== '/swipe' && <Link href="/swipe" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-hs-soft px-5 font-bold text-hs-cream">Browse food first</Link>}
          <p className="mt-5 text-xs text-hs-muted">hungerswipes.com</p>
        </section>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-hs-ink text-hs-cream flex items-center justify-center px-4">
      <div className="text-center">
        <BrandMark size={44} className="mx-auto mb-5" />
        <div className="w-11 h-11 border-4 border-hs-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold">Confirming your Hunger Swipes account…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
