'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body: string
  action?: ReactNode
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-5 text-hs-gold">{icon}</div>}
      <h2 className="text-xl font-bold text-hs-cream mb-2">{title}</h2>
      <p className="text-hs-gray text-sm max-w-[260px] mb-6 leading-relaxed">{body}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
