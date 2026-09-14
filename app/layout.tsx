import type { Metadata } from 'next'
import './globals.css'

import AuthHashHandler from '@/app/components/AuthHashHandler'

const ICON_VERSION = 'v2-20260914'

export const metadata: Metadata = {
  title: 'HungerSwipes — Swipe Food. Find Your Next Meal.',
  description: 'Discover real food from real places through official dishes and clearly labeled community food posts.',
  metadataBase: new URL('https://hunger-swipes-theta.vercel.app'),
  applicationName: 'Hunger Swipes',
  manifest: `/manifest.webmanifest?v=${ICON_VERSION}`,
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_VERSION}`, type: 'image/x-icon', sizes: 'any' },
      { url: `/favicon-32x32.png?v=${ICON_VERSION}`, type: 'image/png', sizes: '32x32' },
      { url: `/favicon-16x16.png?v=${ICON_VERSION}`, type: 'image/png', sizes: '16x16' },
      { url: `/icon.svg?v=${ICON_VERSION}`, type: 'image/svg+xml' },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_VERSION}`, type: 'image/png', sizes: '180x180' }],
    shortcut: `/favicon.png?v=${ICON_VERSION}`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hunger Swipes',
  },
  openGraph: {
    type: 'website',
    url: 'https://hunger-swipes-theta.vercel.app',
    siteName: 'Hunger Swipes',
    title: 'HungerSwipes — Swipe Food. Find Your Next Meal.',
    description: 'Discover real food from real places through official dishes and clearly labeled community food posts.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hunger Swipes — Swipe Food. Find Your Next Meal.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HungerSwipes — Swipe Food. Find Your Next Meal.',
    description: 'Discover real food from real places through official dishes and clearly labeled community food posts.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  )
}
