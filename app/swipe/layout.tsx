import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: 'https://hungerswipes.com/swipe' },
}

export default function SwipeLayout({ children }: { children: React.ReactNode }) {
  return children
}
