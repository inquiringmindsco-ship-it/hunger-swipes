'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, getAuthToken } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { Heart, User, Store, Flame } from 'lucide-react'

function SellerLink() {
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
      <div className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-500">
        <Store size={22} />
        <span className="text-[10px] font-semibold">Sell</span>
      </div>
    )
  }

  const label = sellerId ? 'Dashboard' : 'Sell'
  const href = sellerId ? `/seller/dashboard?id=${sellerId}` : '/join'

  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-500 hover:text-white transition">
      <Store size={22} />
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  )
}

export default function MobileNav() {
  const pathname = usePathname() || ''

  const navItems = [
    { href: '/swipe', label: 'Swipe', icon: Flame },
    { href: '/saved', label: 'Saved', icon: Heart },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/10 z-50 safe-bottom">
      <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                active ? 'text-[#FF5722]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div className={`rounded-xl p-1.5 ${active ? 'bg-[#FF5722]/15' : ''}`}>
                <Icon size={22} />
              </div>
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
            </Link>
          )
        })}

        <SellerLink />

        <Link
          href="/account"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            pathname === '/account' ? 'text-[#FF5722]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className={`rounded-xl p-1.5 ${pathname === '/account' ? 'bg-[#FF5722]/15' : ''}`}>
            <User size={22} />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Account</span>
        </Link>
      </div>
    </div>
  )
}
