'use client'

import { apiFetch, getAuthToken } from '@/lib/auth-fetch'

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers)
  const token = await getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return apiFetch(input, { ...init, headers })
}
