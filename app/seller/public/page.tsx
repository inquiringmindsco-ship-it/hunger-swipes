'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import SlugClientLoader from '@/app/[slug]/SlugClientLoader'
import { BrandMark } from '@/app/components/icons/HungerIcons'

function PublicSellerContent() {
  const params = useSearchParams()
  const slug = (params.get('slug') || '').trim()

  if (!slug) {
    return (
      <div className="min-h-screen bg-hs-ink px-4 py-10 text-hs-cream">
        <div className="mx-auto max-w-md rounded-3xl border border-white/[0.06] bg-hs-charcoal p-6 text-center">
          <BrandMark size={42} className="mx-auto" />
          <h1 className="mt-4 text-xl font-black">Public page unavailable</h1>
          <p className="mt-2 text-sm text-hs-gray">Finish your seller setup to create a public page.</p>
          <Link href="/seller/profile" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-hs-gold px-5 font-bold text-hs-black">Return to setup</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-hs-ink">
      <Link href="/seller/profile" className="fixed left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-lg" aria-label="Back to seller setup">
        <ArrowLeft size={20} />
      </Link>
      <SlugClientLoader slugOverride={slug} />
    </div>
  )
}

export default function PublicSellerPage() {
  return <Suspense fallback={<div className="min-h-screen bg-hs-ink" />}><PublicSellerContent /></Suspense>
}
