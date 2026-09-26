import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hs-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-hs-ink ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
