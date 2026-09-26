import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover food — Hunger Swipes',
  description: 'Swipe through real dishes and community food posts from local restaurants, food trucks, and home kitchens near you.',
  alternates: { canonical: 'https://hungerswipes.com/swipe' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/swipe',
    siteName: 'Hunger Swipes',
    title: 'Discover food — Hunger Swipes',
    description: 'Swipe through real dishes and community food posts from local restaurants, food trucks, and home kitchens near you.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover food — Hunger Swipes',
    description: 'Swipe through real dishes and community food posts from local restaurants, food trucks, and home kitchens near you.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SwipeLayout({ children }: { children: React.ReactNode }) {
  return children
}
