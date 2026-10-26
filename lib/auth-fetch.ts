'use client'

import { getSupabase } from '@/lib/supabase'
import { getApiUrl } from '@/lib/api-url'

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

function resolveInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') return getApiUrl(input)
  if (input instanceof URL) return input.toString()
  return getApiUrl(input.toString())
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Authentication is not configured')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Authentication required')

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(resolveInput(input), { ...init, headers })
}

export async function optionalAuthFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getSupabase()
  const headers = new Headers(init.headers)
  if (supabase) {
    try {
      const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) => {
          window.setTimeout(() => resolve({ data: { session: null } }), 1500)
        }),
      ])
      if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
    } catch {
      // Optional session lookup must never block anonymous public requests.
    }
  }
  return fetch(resolveInput(input), { ...init, headers })
}

/**
 * Plain fetch wrapper that resolves API paths for the native app.
 * Use this for fetch('/api/...') calls in client components.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(resolveInput(input), init)
}
