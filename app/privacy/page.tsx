import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Hunger Swipes',
  description: 'How Hunger Swipes uses account, food post, saved item, swipe, impression, location, seller, and third-party map information.',
  alternates: { canonical: 'https://hungerswipes.com/privacy' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/privacy',
    siteName: 'Hunger Swipes',
    title: 'Privacy Policy — Hunger Swipes',
    description: 'How Hunger Swipes uses account, food post, saved item, swipe, impression, location, seller, and third-party map information.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy — Hunger Swipes',
    description: 'How Hunger Swipes uses account, food post, saved item, swipe, impression, location, seller, and third-party map information.',
    images: ['/og-image.png'],
  },
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-6 py-12 text-gray-900">
      <Link href="/" className="text-[#FF5722]">← HungerSwipes</Link>
      <h1 className="mt-6 text-3xl font-black">Privacy Policy</h1>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Accounts</h2>
        <p>Hunger Swipes uses your email and optional profile information (name, handle, bio, social links, profile photo) to identify you, display your public Food Profile if you choose to create one, and secure your account. We do not sell account information.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Location</h2>
        <p>Precise browser or device location is requested only when you choose Nearby / “Use my location.” Location is used to rank nearby Places and dishes, then discarded from memory as soon as the request completes. You can use Discover in For You or Trending modes without sharing location.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Food posts, swipes, saves, and impact</h2>
        <p>Community food posts, right/left swipes, saved dishes, and recipe purchase intent are recorded so the app can show you relevant food, maintain your Saved list for 24 hours, populate your Swipe History, and compute private engagement signals for sellers and creators. Public food profiles show only posts you mark as profile-eligible.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Moderation and content removal</h2>
        <p>Uploaded food photos are scanned for safety and food relevance before appearing in Discover. Posts may be held for manual review, rejected, or removed. You can delete your own community posts at any time from your account; deletion marks the post as removed and stops future public display and new Swipe Bucks attribution.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Retention and deletion</h2>
        <p>Swipe and saved-item history is retained while your account exists so you can revisit it in History. Community posts remain until you delete them or we remove them for policy reasons. Seller listings remain until the seller or an admin removes them. You may request account deletion by contacting support.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Sellers and creators</h2>
        <p>Seller profiles, dishes, recipes, Stripe Connect status, and staff PINs are stored to operate seller dashboards, public pages, and recipe commerce. Seller owners can update their own listings; admin actions can change status, verification, and ownership for safety or support.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Third-party providers</h2>
        <p>When Google Place imagery is enabled and displayed, the app requests current Place and photo information from Google Maps Platform. Google may receive request information such as your IP address and browser details. See the <a className="text-[#FF5722] underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>. OpenStreetMap provider identity and permitted Place directory metadata are retained for attribution and deduplication.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Contact</h2>
        <p>For privacy questions or deletion requests, contact support through your seller dashboard or the app’s support channels.</p>
      </section>
    </main>
  )
}
