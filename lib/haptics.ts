'use client'

import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { isNativeApp } from './capacitor'

export async function hapticImpact(style: ImpactStyle = ImpactStyle.Light) {
  if (!isNativeApp()) return
  try {
    await Haptics.impact({ style })
  } catch {
    // Ignore if haptics are unavailable.
  }
}

export async function hapticSwipe(direction: 'left' | 'right') {
  await hapticImpact(direction === 'right' ? ImpactStyle.Medium : ImpactStyle.Light)
}
