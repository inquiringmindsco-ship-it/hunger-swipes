'use client'

import { getSupabase } from '@/lib/supabase'

export async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Authentication is not configured')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Authentication required')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(input, { ...init, headers })
}

export async function optionalAuthFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getSupabase()
  const headers = new Headers(init.headers)
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
    } catch {
      // Optional session lookup must never block anonymous public requests.
    }
  }
  return fetch(input, { ...init, headers })
}
