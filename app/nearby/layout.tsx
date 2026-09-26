import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nearby food places — Hunger Swipes',
  description: 'Find real restaurants, food trucks, home kitchens, and food sellers near you.',
  alternates: { canonical: 'https://hungerswipes.com/nearby' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/nearby',
    siteName: 'Hunger Swipes',
    title: 'Nearby food places — Hunger Swipes',
    description: 'Find real restaurants, food trucks, home kitchens, and food sellers near you.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nearby food places — Hunger Swipes',
    description: 'Find real restaurants, food trucks, home kitchens, and food sellers near you.',
    images: ['/og-image.png'],
  },
}

export default function NearbyLayout({ children }: { children: React.ReactNode }) {
  return children
}
