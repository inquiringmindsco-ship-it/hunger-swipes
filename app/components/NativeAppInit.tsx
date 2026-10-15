'use client'

import { useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard } from '@capacitor/keyboard'
import { isNativeApp } from '@/lib/capacitor'
import { initPushNotifications, listenToPushNotifications } from '@/lib/push-notifications'
import { initDeepLinks } from '@/lib/deep-links'

export default function NativeAppInit() {
  useEffect(() => {
    if (!isNativeApp()) return

    async function init() {
      try {
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#0A0A0A' })
      } catch {
        // Status bar may not be available in all contexts.
      }

      try {
        await Keyboard.setScroll({ isDisabled: false })
      } catch {
        // Keyboard plugin may not be configured.
      }

      try {
        await SplashScreen.hide({ fadeOutDuration: 500 })
      } catch {
        // Auto-hide is configured; manual hide is a fallback.
      }

      try {
        await initPushNotifications()
        listenToPushNotifications()
      } catch {
        // Push notification plugin may not be configured.
      }

      try {
        initDeepLinks((path) => {
          if (typeof window !== 'undefined') {
            window.location.href = path
          }
        })
      } catch {
        // Deep link plugin may not be configured.
      }
    }

    void init()
  }, [])

  return null
}
