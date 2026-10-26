'use client'

import { App } from '@capacitor/app'
import { isNativeApp } from './capacitor'

/**
 * Listen for universal links / deep links in the native app and navigate.
 * Example: opening https://hungerswipes.com/swipe from outside the app routes internally.
 */
export function initDeepLinks(onNavigate?: (path: string) => void) {
  if (!isNativeApp()) return

  App.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url)
      if (url.hostname !== 'hungerswipes.com' && url.hostname !== 'www.hungerswipes.com') return
      const path = url.pathname + url.search
      onNavigate?.(path)
    } catch {
      // Ignore malformed URLs.
    }
  })
}
