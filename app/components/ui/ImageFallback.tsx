'use client'

import { RestaurantIcon } from '@/app/components/icons/HungerIcons'

interface ImageFallbackProps {
  label?: string
  className?: string
}

export function ImageFallback({ label = 'Photo unavailable', className = '' }: ImageFallbackProps) {
  return (
    <div className={`flex flex-col items-center justify-center bg-hs-graphite text-center p-6 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-hs-soft flex items-center justify-center mb-3">
        <RestaurantIcon size={28} className="text-hs-gray" />
      </div>
      <p className="text-hs-gray text-sm">{label}</p>
    </div>
  )
}
