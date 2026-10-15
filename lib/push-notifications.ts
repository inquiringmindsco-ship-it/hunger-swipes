'use client'

import { PushNotifications } from '@capacitor/push-notifications'
import { isNativeApp } from './capacitor'

/**
 * Initialize push notification infrastructure for the native app.
 * This registers the device with APNS but does not send any notifications.
 * Actual notification sending happens server-side and is configured by Codex.
 */
export async function initPushNotifications() {
  if (!isNativeApp()) return

  try {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive === 'granted') {
      await PushNotifications.register()
    }
  } catch {
    // Ignore if the plugin is not configured or the user declines.
  }
}

export function listenToPushNotifications(
  onToken?: (token: string) => void,
  onError?: (error: any) => void,
) {
  if (!isNativeApp()) return

  PushNotifications.addListener('registration', (token) => {
    onToken?.(token.value)
  })

  PushNotifications.addListener('registrationError', (error) => {
    onError?.(error)
  })
}
