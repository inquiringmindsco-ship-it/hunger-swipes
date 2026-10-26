'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { isNativeApp } from './capacitor'

let listenersAttached = false

/**
 * Attach push notification listeners without requesting permission.
 * Permission should be requested only after the user has context (e.g., a
 * settings or onboarding screen) to avoid App Store rejection.
 */
export function initPushNotifications() {
  if (!isNativeApp() || listenersAttached) return
  listenersAttached = true

  PushNotifications.addListener('registration', () => {
    // Token persistence is intentionally deferred until the approved backend
    // registration endpoint exists. Never print APNs device tokens to logs.
  })

  PushNotifications.addListener('registrationError', (error) => {
    // eslint-disable-next-line no-console
    console.error('Push registration error:', error)
  })

  PushNotifications.addListener('pushNotificationReceived', () => {
    // Foreground presentation will be added with the approved notification UX.
    // Do not log notification payloads because they may contain user data.
  })
}

/**
 * Request push notification permission and register with APNS.
 * Call this from a user-initiated action, not on app launch.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return false
    await PushNotifications.register()
    return true
  } catch {
    return false
  }
}
