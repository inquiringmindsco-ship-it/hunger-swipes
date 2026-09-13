import type { Metadata } from 'next'
import './globals.css'

import AuthHashHandler from '@/app/components/AuthHashHandler'

export const metadata: Metadata = {
  title: 'HungerSwipes — One Photo. Paid Forever.',
  description: 'The first food photography app where you earn commission every time your photo drives an order. Swipe to discover. Upload to earn.',
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
