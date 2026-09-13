'use client'

import Link from 'next/link'
import { useAuth, signOut, getAuthToken } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { LogOut, Store, Heart, User } from 'lucide-react'
import MobileNav from '@/app/components/MobileNav'

export default function AccountPage() {
  const { user, loading } = useAuth()
  const [seller, setSeller] = useState<any>(null)
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
          if (data.seller) setSeller(data.seller)
        })
        .finally(() => setChecking(false))
    )
  }, [user, loading])

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center p-4">
        <User size={48} className="text-[#FF5722] mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign in to Hunger Swipes</h1>
        <p className="text-gray-400 mb-6 text-center">Create an account to save dishes or list your food.</p>
        <Link
          href="/auth?next=/account"
          className="px-8 py-4 bg-[#FF5722] text-white rounded-full font-bold"
        >
          Sign In / Sign Up
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-24">
      <header className="px-4 py-4 border-b border-white/5">
        <h1 className="text-xl font-bold">Account</h1>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#FF5722]/20 rounded-full flex items-center justify-center">
              <User size={24} className="text-[#FF5722]" />
            </div>
            <div>
              <p className="font-bold">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>

        {seller ? (
          <Link
            href={`/seller/dashboard?id=${seller.id}`}
            className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.05] transition"
          >
            <div className="flex items-center gap-3">
              <Store size={20} className="text-[#FF5722]" />
              <div>
                <p className="font-semibold">{seller.business_name}</p>
                <p className="text-xs text-gray-400 capitalize">{seller.status} · {seller.verification_status}</p>
              </div>
            </div>
            <span className="text-gray-500">→</span>
          </Link>
        ) : (
          <Link
            href="/join"
            className="flex items-center justify-between bg-[#FF5722]/10 border border-[#FF5722]/20 rounded-2xl p-4 hover:bg-[#FF5722]/15 transition"
          >
            <div className="flex items-center gap-3">
              <Store size={20} className="text-[#FF5722]" />
              <p className="font-semibold">List Your Food</p>
            </div>
            <span className="text-[#FF5722]">→</span>
          </Link>
        )}

        <Link
          href="/saved"
          className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.05] transition"
        >
          <div className="flex items-center gap-3">
            <Heart size={20} className="text-[#FF5722]" />
            <p className="font-semibold">Saved Dishes</p>
          </div>
          <span className="text-gray-500">→</span>
        </Link>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-red-400 font-semibold hover:bg-white/10 transition"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
      <MobileNav />
    </div>
  )
}
