'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function CallbackContent() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    const next = params.get('next') || '/swipe'

    const finish = async () => {
      try {
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

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          localStorage.setItem('hungerswipes_user', JSON.stringify(session.user))
        }

        router.replace(next)
      } catch (err: any) {
        console.error('Callback error:', err)
        router.replace(`/auth?error=${encodeURIComponent(err.message || 'callback_failed')}`)
      }
    }

    finish()
  }, [params, router])

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
