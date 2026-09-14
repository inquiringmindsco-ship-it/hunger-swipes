'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function AuthHashHandler() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return

    const supabase = getSupabase()
    if (!supabase) return

    supabase.auth.getSession().then(() => {
      // Remove tokens from URL
      const url = new URL(window.location.href)
      url.hash = ''
      window.history.replaceState({}, '', url.toString())
      // Default redirect to swipe if no explicit next
      router.replace('/swipe')
    })
  }, [router])

  return null
}
