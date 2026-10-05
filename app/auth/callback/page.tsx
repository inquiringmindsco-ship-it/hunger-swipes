'use client'

import { useEffect, Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-fetch'
import { safeNextRoute } from '@/lib/auth-routes'

function CallbackContent() {
  const router = useRouter()
  const [started, setStarted] = useState(false)

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

        router.replace(next)
      } catch (err: any) {
        console.error('Callback error:', err)
        router.replace(`/auth?error=${encodeURIComponent(err.message || 'callback_failed')}`)
      }
    }

    finish()
  }, [started, router])

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#FF5722] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Confirming your account...</p>
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
