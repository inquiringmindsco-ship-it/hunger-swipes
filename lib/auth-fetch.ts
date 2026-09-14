'use client'

import { getSupabase } from '@/lib/supabase'

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
    const { data: { session } } = await supabase.auth.getSession()
    if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(input, { ...init, headers })
}
