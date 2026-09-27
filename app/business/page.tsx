import { Metadata } from 'next'
import BusinessClient from './BusinessClient'

export const metadata: Metadata = {
  title: 'Get Your Restaurant on Hunger Swipes',
  description: 'Food-first discovery for restaurants. Customers swipe right on dishes they want. Join Hunger Swipes and turn your menu into a visual, shareable feed.',
  metadataBase: new URL('https://hungerswipes.com'),
  alternates: { canonical: '/business' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/business',
    siteName: 'Hunger Swipes',
    title: 'Get Your Restaurant on Hunger Swipes',
    description: 'Food-first discovery. Customers swipe right on dishes they want.',
    images: ['/og-image.png'],
  },
}

export default function BusinessPage() {
  return <BusinessClient />
}
