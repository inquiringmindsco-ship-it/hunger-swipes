import type { Metadata } from 'next'
import './globals.css'

import AuthHashHandler from '@/app/components/AuthHashHandler'

export const metadata: Metadata = {
  title: 'HungerSwipes — Swipe Food. Find Your Next Meal.',
  description: 'Discover real food from real places through official dishes and clearly labeled community food posts.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png', sizes: '1254x1254' }],
    shortcut: '/favicon.png',
    apple: [{ url: '/logo.png', type: 'image/png', sizes: '1254x1254' }],
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
