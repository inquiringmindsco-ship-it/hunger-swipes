'use client'

import { Capacitor } from '@capacitor/core'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (Capacitor.getPlatform() === 'ios') return 'ios'
  if (Capacitor.getPlatform() === 'android') return 'android'
  return 'web'
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios'
}
