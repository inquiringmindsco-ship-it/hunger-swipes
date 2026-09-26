import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Hunger Swipes',
  description: 'How Hunger Swipes uses account, food post, saved item, swipe, impression, and optional location information.',
  alternates: { canonical: 'https://hungerswipes.com/privacy' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/privacy',
    siteName: 'Hunger Swipes',
    title: 'Privacy Policy — Hunger Swipes',
    description: 'How Hunger Swipes uses account, food post, saved item, swipe, impression, and optional location information.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy — Hunger Swipes',
    description: 'How Hunger Swipes uses account, food post, saved item, swipe, impression, and optional location information.',
    images: ['/og-image.png'],
  },
}

export default function PrivacyPage() {
  return <main className="mx-auto min-h-screen max-w-2xl bg-white px-6 py-12 text-gray-900"><Link href="/" className="text-[#FF5722]">← HungerSwipes</Link><h1 className="mt-6 text-3xl font-black">Privacy</h1><p className="mt-4">HungerSwipes uses account, food-post, saved-item, swipe, impression, and optional location information to operate the service. Precise browser location is requested only when you choose Near Me and is used to rank nearby Places.</p><p className="mt-4">When Google Place imagery is enabled and displayed, the app requests current Place and photo information from Google Maps Platform. Google may receive request information such as your IP address and browser details. See the <a className="text-[#FF5722] underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p><p className="mt-4">Google photo resource names and image files are not stored in HungerSwipes storage. OpenStreetMap provider identity and permitted Place directory metadata are retained for attribution and deduplication.</p></main>
}
