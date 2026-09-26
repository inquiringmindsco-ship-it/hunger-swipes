'use client'

import Link from 'next/link'
import { useAuth, signOut, getAuthToken } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { LogOut, Store, Heart, User, ChevronRight, MapPin, SlidersHorizontal, Shield, Bell, Utensils } from 'lucide-react'
import { BrandMark, ProfileIcon } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 px-1">{title}</h2>
      <div className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] overflow-hidden">{children}</div>
    </section>
  )
}

function Row({
  href,
  onClick,
  icon,
  label,
  detail,
  danger,
}: {
  href?: string
  onClick?: () => void
  icon: React.ReactNode
  label: string
  detail?: string
  danger?: boolean
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? 'bg-hs-red/10 text-hs-red' : 'bg-hs-soft text-hs-gold'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${danger ? 'text-hs-red' : 'text-hs-cream'}`}>{label}</p>
          {detail && <p className="text-xs text-hs-gray truncate">{detail}</p>}
        </div>
      </div>
      <ChevronRight size={16} className={`shrink-0 ${danger ? 'text-hs-red/60' : 'text-hs-gray'}`} />
    </>
  )

  const className = "flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition"

  if (href) {
    return <Link href={href} className={className}>{content}</Link>
  }

  return (
    <button onClick={onClick} className={`w-full ${className}`}>
      {content}
    </button>
  )
}

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
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Profile</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your profile…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Profile</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-hs-soft flex items-center justify-center mx-auto mb-5">
            <ProfileIcon size={32} className="text-hs-gold" />
          </div>
          <h1 className="text-2xl font-bold text-hs-cream mb-2">Sign in to Hunger Swipes</h1>
          <p className="text-hs-gray text-sm mb-6 max-w-[260px] mx-auto">Create an account to save dishes or list your food.</p>
          <Link
            href="/auth?next=/account"
            className="inline-block px-8 py-3.5 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
          >
            Sign In / Sign Up
          </Link>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">Profile</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Profile summary */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-hs-gold/10 flex items-center justify-center text-hs-gold">
            <User size={28} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-hs-cream truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
            <p className="text-sm text-hs-gray truncate">{user.email}</p>
          </div>
        </div>

        <Section title="Discovery">
          <Row
            href="/preferences"
            icon={<SlidersHorizontal size={18} />}
            label="Food Preferences"
            detail="Cuisine, dietary, health"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            href="#"
            icon={<MapPin size={18} />}
            label="Location & Distance"
            detail="Set your discovery radius"
          />
        </Section>

        <Section title="Selling">
          {seller ? (
            <>
              <Row
                href={`/seller/dashboard?id=${seller.id}`}
                icon={<Store size={18} />}
                label="Seller Dashboard"
                detail={`${seller.business_name} • ${seller.status.replace('_', ' ')}`}
              />
              <div className="h-px bg-white/[0.06]" />
              <Row
                href="/seller/dishes/new"
                icon={<Utensils size={18} />}
                label="Add a Dish"
                detail="Publish a new dish to discover"
              />
            </>
          ) : (
            <Row
              href="/join"
              icon={<Store size={18} />}
              label="List Your Food"
              detail="Become a seller on Hunger Swipes"
            />
          )}
        </Section>

        <Section title="Saved">
          <Row
            href="/saved"
            icon={<Heart size={18} />}
            label="Saved Dishes"
            detail="See everything you want"
          />
        </Section>

        <Section title="Account">
          <Row
            href="#"
            icon={<Bell size={18} />}
            label="Notifications"
            detail="Coming soon"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            href="/privacy"
            icon={<Shield size={18} />}
            label="Privacy"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            onClick={signOut}
            icon={<LogOut size={18} />}
            label="Sign Out"
            danger
          />
        </Section>
      </main>
      <MobileNav />
    </div>
  )
}
