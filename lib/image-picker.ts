'use client'

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNativeApp } from './capacitor'

export interface ImagePickerOptions {
  source?: 'camera' | 'photos' | 'prompt'
}

/**
 * Pick an image. On native iOS/Android this uses the Capacitor Camera plugin.
 * On web it falls back to a hidden file input.
 */
export async function pickImage(options: ImagePickerOptions = {}): Promise<{ file: File; previewUrl: string } | null> {
  if (!isNativeApp()) {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      if (options.source === 'camera' && 'capture' in input) {
        (input as any).capture = 'environment'
      }
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) return resolve(null)
        resolve({ file, previewUrl: URL.createObjectURL(file) })
      }
      input.click()
    })
  }

  let cameraSource = CameraSource.Prompt
  if (options.source === 'camera') cameraSource = CameraSource.Camera
  if (options.source === 'photos') cameraSource = CameraSource.Photos

  const result = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: cameraSource,
  })

  if (!result.webPath) return null

  const response = await fetch(result.webPath)
  const blob = await response.blob()
  const filename = result.format ? `image.${result.format}` : 'image.jpg'
  const file = new File([blob], filename, { type: blob.type || `image/${result.format || 'jpeg'}` })
  return { file, previewUrl: result.webPath }
}
