import type { Metadata } from 'next'
import './globals.css'

import AuthHashHandler from '@/app/components/AuthHashHandler'
import PwaRegistration from '@/app/components/PwaRegistration'

const ICON_VERSION = 'v4-20260926'
const SITE_TITLE = 'Hunger Swipes — Swipe food. Find your next meal.'
const SITE_DESCRIPTION = 'Discover real food from real local places through official dishes and clearly labeled community food posts.'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: new URL('https://hungerswipes.com'),
  alternates: {
    canonical: '/',
  },
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
    url: '/',
    siteName: 'Hunger Swipes',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hunger Swipes — Swipe food. Find your next meal.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Hunger Swipes',
      url: 'https://hungerswipes.com',
      description: SITE_DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Hunger Swipes',
      url: 'https://hungerswipes.com',
      logo: 'https://hungerswipes.com/icon-512.png',
      description: SITE_DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Hunger Swipes',
      url: 'https://hungerswipes.com/swipe',
      applicationCategory: 'FoodAndDrinkApplication',
      operatingSystem: 'Any',
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ]

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">
        <AuthHashHandler />
        <PwaRegistration />
        {children}
      </body>
    </html>
  )
}
