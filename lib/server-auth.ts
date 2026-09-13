import 'server-only'

import { createClient, User } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!token || !supabaseUrl || !anonKey) return null

  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await auth.auth.getUser(token)
  return error ? null : data.user
}
