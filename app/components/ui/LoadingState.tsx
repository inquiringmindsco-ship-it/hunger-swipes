'use client'

import { BrandMark } from '@/app/components/icons/HungerIcons'

interface LoadingStateProps {
  label?: string
  showBrand?: boolean
}

export function LoadingState({ label = 'Finding great food…', showBrand = true }: LoadingStateProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      {showBrand && <BrandMark size={48} className="mb-6 opacity-90" />}
      <div className="w-12 h-12 rounded-full border-2 border-hs-soft border-t-hs-gold animate-spin mb-4" />
      <p className="text-hs-silver text-sm font-medium animate-pulse-soft">{label}</p>
    </div>
  )
}
