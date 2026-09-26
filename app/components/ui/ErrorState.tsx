'use client'

import { ReactNode } from 'react'
import { WarningIcon } from '@/app/components/icons/HungerIcons'

interface ErrorStateProps {
  title?: string
  body?: string
  action?: ReactNode
}

export function ErrorState({
  title = 'Couldn\'t load food right now',
  body = 'Check your connection and try again.',
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-hs-red/10 flex items-center justify-center mb-5">
        <WarningIcon size={28} className="text-hs-red" />
      </div>
      <h2 className="text-xl font-bold text-hs-cream mb-2">{title}</h2>
      <p className="text-hs-gray text-sm max-w-[280px] mb-6 leading-relaxed">{body}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
