'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'

interface ProfileData {
  handle: string
  owner_type: 'user' | 'seller'
  profile?: {
    bio?: string
    profile_photo_url?: string
    website_url?: string
    instagram_handle?: string
    tiktok_handle?: string
    youtube_url?: string
  } | null
  entity?: { business_name?: string; id?: string } | null
  dishes?: any[]
  recipes?: any[]
  private?: {
    follower_count?: number | null
    following_count?: number | null
    is_following?: boolean | null
  }
}

function normalizeExternalUrl(raw: string | null | undefined, defaultProtocol = 'https://'): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed)
    return trimmed
  } catch {
    // try with protocol
    try {
      // eslint-disable-next-line no-new
      new URL(`${defaultProtocol}${trimmed}`)
      return `${defaultProtocol}${trimmed}`
    } catch {
      return null
    }
  }
}

function safeExternalLink(href: string, label: string, icon?: React.ReactNode) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl bg-hs-soft px-4 py-3 text-sm font-semibold text-hs-cream hover:bg-hs-graphite transition"
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
      <ExternalLink size={14} className="ml-auto shrink-0 text-hs-gray" />
    </a>
  )
}

export default function FoodProfileClient({ initialData }: { initialData: ProfileData }) {
  const [data] = useState<ProfileData>(initialData)
  const displayName = data.owner_type === 'seller' ? data.entity?.business_name : `@${data.handle}`

  const website = normalizeExternalUrl(data.profile?.website_url)
  const youtube = normalizeExternalUrl(data.profile?.youtube_url)
  const instagram = data.profile?.instagram_handle?.trim()
    ? normalizeExternalUrl(
        data.profile!.instagram_handle!.startsWith('http')
          ? data.profile!.instagram_handle
          : `https://instagram.com/${data.profile!.instagram_handle!.replace(/^@/, '')}`,
      )
    : null
  const tiktok = data.profile?.tiktok_handle?.trim()
    ? normalizeExternalUrl(
        data.profile!.tiktok_handle!.startsWith('http')
          ? data.profile!.tiktok_handle
          : `https://tiktok.com/@${data.profile!.tiktok_handle!.replace(/^@/, '')}`,
      )
    : null

  const hasLinks = website || youtube || instagram || tiktok

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">Food Profile</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
          <div className="flex items-center gap-4">
            {data.profile?.profile_photo_url ? (
              <img src={data.profile.profile_photo_url} alt={`${displayName || 'Profile'} photo`} className="w-16 h-16 rounded-full object-cover bg-hs-soft" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-hs-gold/10 flex items-center justify-center text-hs-gold text-xl font-black">
                {displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-hs-cream">{displayName}</h1>
              <p className="text-sm text-hs-gold">@{data.handle}</p>
            </div>
          </div>
          {data.profile?.bio && <p className="mt-4 text-sm text-hs-gray leading-relaxed">{data.profile.bio}</p>}

          {hasLinks && (
            <div className="mt-5 space-y-2">
              {website && safeExternalLink(website, 'Website')}
              {instagram && safeExternalLink(instagram, 'Instagram')}
              {tiktok && safeExternalLink(tiktok, 'TikTok')}
              {youtube && safeExternalLink(youtube, 'YouTube')}
            </div>
          )}
        </section>

        {data.dishes && data.dishes.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-hs-cream mb-3">Their Food</h2>
            <div className="grid grid-cols-2 gap-3">
              {data.dishes.map((dish: any) => (
                <div key={dish.id} className="bg-hs-charcoal rounded-2xl overflow-hidden border border-white/[0.06]">
                  {dish.photo_url && <img src={dish.photo_url} alt={dish.name || dish.dish_name || 'Food photo'} className="w-full h-28 object-cover" />}
                  <div className="p-3">
                    <p className="text-xs font-bold text-hs-cream truncate">{dish.name || dish.dish_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.recipes && data.recipes.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-hs-cream mb-3">Recipes</h2>
            <div className="space-y-3">
              {data.recipes.map((recipe: any) => (
                <div key={recipe.id} className="bg-hs-charcoal rounded-2xl p-4 border border-white/[0.06]">
                  <p className="font-bold text-hs-cream">{recipe.title}</p>
                  <p className="text-xs text-hs-gold mt-1">
                    {recipe.recipe_type === 'free' ? 'Free' : recipe.recipe_type === 'proud_to_pay' ? `Proud to Pay from $${Number(recipe.min_proud_to_pay_amount || recipe.price).toFixed(2)}` : `$${Number(recipe.price).toFixed(2)}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="text-center pt-4">
          <Link href="/swipe" className="text-xs text-hs-gold font-semibold">Discover more food →</Link>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
