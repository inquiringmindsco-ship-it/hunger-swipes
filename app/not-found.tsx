import Link from 'next/link'
import { BrandMark } from '@/app/components/icons/HungerIcons'

export const metadata = {
  title: 'Page not found — Hunger Swipes',
  description: 'We couldn’t find that page. Discover food or head back home.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-hs-ink flex flex-col items-center justify-center px-6 pb-24 text-center">
      <BrandMark size={64} className="text-hs-gold mb-6" />
      <h1 className="text-3xl font-black text-hs-cream mb-2">Page not found</h1>
      <p className="text-hs-gray max-w-sm mb-8">
        We couldn’t find the page you were looking for. It may have moved, or the link might be off.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/swipe"
          className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
        >
          Discover food
        </Link>
        <Link
          href="/"
          className="px-8 py-3 border border-white/[0.08] text-hs-cream rounded-full font-semibold text-sm hover:bg-hs-charcoal transition"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
