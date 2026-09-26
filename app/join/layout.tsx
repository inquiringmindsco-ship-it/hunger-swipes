import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join as a food seller — Hunger Swipes',
  description: 'List your restaurant, food truck, home kitchen, or pop-up on Hunger Swipes and reach people discovering food near you.',
  alternates: { canonical: 'https://hungerswipes.com/join' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/join',
    siteName: 'Hunger Swipes',
    title: 'Join as a food seller — Hunger Swipes',
    description: 'List your restaurant, food truck, home kitchen, or pop-up on Hunger Swipes and reach people discovering food near you.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join as a food seller — Hunger Swipes',
    description: 'List your restaurant, food truck, home kitchen, or pop-up on Hunger Swipes and reach people discovering food near you.',
    images: ['/og-image.png'],
  },
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}
