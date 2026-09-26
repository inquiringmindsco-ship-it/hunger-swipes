'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImageFallback } from '@/app/components/ui/ImageFallback'

interface DishImageProps {
  src: string
  alt: string
  sizes: string
  preload?: boolean
  quality?: number
  className?: string
  objectPosition?: string
}

export function DishImage({ src, alt, sizes, preload = false, quality = 82, className = '', objectPosition = '50% 50%' }: DishImageProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <ImageFallback label={alt ? `${alt} photo unavailable` : 'Dish photo unavailable'} className={className} />

  const managed = /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/dish-photos\//.test(src)
  if (!managed) {
    return <img src={src} alt={alt} className={className} style={{ objectPosition }} loading={preload ? 'eager' : 'lazy'} onError={() => setFailed(true)} draggable={false} />
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={quality}
      preload={preload}
      loading={preload ? undefined : 'lazy'}
      className={className}
      style={{ objectPosition }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  )
}
