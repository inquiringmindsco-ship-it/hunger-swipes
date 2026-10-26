'use client'

import { isNativeApp } from './capacitor'

/**
 * Resolves an API path to a full URL.
 * - In the web app, relative paths stay relative so cookies/same-origin work.
 * - In the native Capacitor app, paths are prefixed with NEXT_PUBLIC_API_BASE_URL
 *   because the app runs from capacitor://localhost.
 */
export function getApiUrl(path: string): string {
  if (!path.startsWith('/')) return path
  if (typeof window === 'undefined') return path
  if (!isNativeApp()) return path

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
  if (!base) {
    // Fallback to current web origin if no base URL is configured.
    return `${window.location.origin}${path}`
  }
  return `${base}${path}`
}
