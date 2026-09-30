import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use — Hunger Swipes',
  description: 'Terms for using Hunger Swipes to discover food through community posts, official seller dishes, recipes, and real Places.',
  alternates: { canonical: 'https://hungerswipes.com/terms' },
  openGraph: {
    type: 'website',
    url: 'https://hungerswipes.com/terms',
    siteName: 'Hunger Swipes',
    title: 'Terms of Use — Hunger Swipes',
    description: 'Terms for using Hunger Swipes to discover food through community posts, official seller dishes, recipes, and real Places.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Use — Hunger Swipes',
    description: 'Terms for using Hunger Swipes to discover food through community posts, official seller dishes, recipes, and real Places.',
    images: ['/og-image.png'],
  },
}

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-6 py-12 text-gray-900">
      <Link href="/" className="text-[#FF5722]">← HungerSwipes</Link>
      <h1 className="mt-6 text-3xl font-black">Terms of Use</h1>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Service</h2>
        <p>Hunger Swipes helps people discover food through community food posts, official seller dishes, recipe products, and a directory of real Places. An unclaimed Place is not a partner, verified seller, or endorsement.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Accounts and acceptable use</h2>
        <p>You must provide accurate account information. You may not impersonate another person or business, manipulate swipes or rewards, or use automated means to interact with the service. One individual may operate one seller account; admin transfer requires verification.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">User-generated content</h2>
        <p>You may upload only food images and information you own or are authorized to share. We may moderate, reject, or remove content that does not clearly show food, violates rights, or misrepresents a place or dish. Deleting your own post removes it from public display and stops future attribution.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Sellers and creators</h2>
        <p>Sellers must provide truthful business information, ordering details, and pricing. Seller listings are subject to review before becoming active. Recipe commerce uses Stripe Connect in test mode until approved for live payments. Sellers are responsible for fulfilling orders placed through their own ordering links or contact methods.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Payments and rewards</h2>
        <p>Swipe Bucks, recipe purchases, and redemptions are governed by separate in-app terms and caps. Live recipe payments remain off until economic proof is demonstrated and approved. No gambling or guaranteed rewards are offered.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Third-party content</h2>
        <p>Place directory data may include OpenStreetMap data © OpenStreetMap contributors under ODbL. When Google Maps Platform content is displayed, your use is also subject to the <a className="text-[#FF5722] underline" href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noreferrer">Google Maps/Google Earth Additional Terms</a>.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-bold">Disclaimers and changes</h2>
        <p>Food prices, availability, and ordering are provided by sellers and places; Hunger Swipes does not guarantee them. We may update these terms and will post the latest version here.</p>
      </section>
    </main>
  )
}
