'use client'

import { ReactNode } from 'react'
import { WarningIcon } from '@/app/components/icons/HungerIcons'

interface OfflineStateProps {
  action?: ReactNode
}

export function OfflineState({ action }: OfflineStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-hs-graphite flex items-center justify-center mb-5">
        <WarningIcon size={28} className="text-hs-gray" />
      </div>
      <h2 className="text-xl font-bold text-hs-cream mb-2">You\'re offline</h2>
      <p className="text-hs-gray text-sm max-w-[280px] mb-6 leading-relaxed">
        Connect to the internet to discover dishes near you.
      </p>
      {action && <div>{action}</div>}
    </div>
  )
}
