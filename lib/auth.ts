'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setState((s) => ({ ...s, loading: false, error: 'Supabase not configured' }))
      return
    }

    let mounted = true

    const refresh = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) {
        setState({ user: null, session: null, loading: false, error: error.message })
      } else {
        setState({
          user: data.session?.user || null,
          session: data.session || null,
          loading: false,
          error: null,
        })
      }
    }

    refresh()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setState({
        user: session?.user || null,
        session,
        loading: false,
        error: null,
      })
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

export async function signOut() {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hungerswipes_user')
    localStorage.removeItem('hs_eater_id')
  }
}
