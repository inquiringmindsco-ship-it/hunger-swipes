'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, getAuthToken } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { DiscoverIcon, SavedIcon, PostIcon, SellIcon, ProfileIcon } from '@/app/components/icons/HungerIcons'

function SellerLink() {
  const pathname = usePathname() || ''
  const { user, loading } = useAuth()
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setChecking(false)
      return
    }
    getAuthToken().then((token) =>
      fetch('/api/sellers?mine=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.seller?.id) setSellerId(data.seller.id)
        })
        .finally(() => setChecking(false))
    )
  }, [user, loading])

  if (loading || checking) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 min-w-[54px] min-h-[54px] py-2 text-hs-muted">
        <SellIcon size={22} />
        <span className="text-[10px] font-semibold whitespace-nowrap">Sell</span>
      </div>
    )
  }

  const active = pathname.startsWith('/seller/') || pathname === '/join' || pathname === '/business'
  const label = sellerId ? 'Sell' : 'Sell'
  const href = sellerId ? `/seller/dashboard?id=${sellerId}` : '/join'

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 min-w-[54px] min-h-[54px] py-2 rounded-2xl transition ${
        active ? 'text-hs-gold' : 'text-hs-gray hover:text-hs-cream'
      }`}
    >
      <div className={`rounded-xl p-1.5 ${active ? 'bg-hs-gold/10' : ''}`}>
        <SellIcon size={22} />
      </div>
      <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap">{label}</span>
    </Link>
  )
}

export default function MobileNav() {
  const pathname = usePathname() || ''

  const navItems = [
    { href: '/swipe', label: 'Discover', icon: DiscoverIcon },
    { href: '/saved', label: 'Saved', icon: SavedIcon },
    { href: '/post', label: 'Post', icon: PostIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-hs-black/95 backdrop-blur-xl border-t border-white/[0.06] z-50 safe-bottom">
      <div className="flex items-end justify-around py-2 px-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 min-w-[54px] min-h-[54px] py-2 rounded-2xl transition-all ${
                active ? 'text-hs-gold' : 'text-hs-gray hover:text-hs-cream'
              }`}
            >
              <div className={`rounded-xl p-1.5 ${active ? 'bg-hs-gold/10' : ''}`}>
                <Icon size={23} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}

        <SellerLink />

        <Link
          href="/account"
          className={`flex flex-col items-center justify-center gap-1 min-w-[54px] min-h-[54px] py-2 rounded-2xl transition-all ${
            pathname === '/account' ? 'text-hs-gold' : 'text-hs-gray hover:text-hs-cream'
          }`}
        >
          <div className={`rounded-xl p-1.5 ${pathname === '/account' ? 'bg-hs-gold/10' : ''}`}>
            <ProfileIcon size={23} />
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap">Profile</span>
        </Link>
      </div>
    </nav>
  )
}
