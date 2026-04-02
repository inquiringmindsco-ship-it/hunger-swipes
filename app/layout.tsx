import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HungerSwipes — One Photo. Paid Forever.',
  description: 'The first food photography app where you earn commission every time your photo drives an order. Swipe to discover. Upload to earn.',
  icons: {
    icon: '/favicon.png',
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
        {children}
      </body>
    </html>
  )
}
