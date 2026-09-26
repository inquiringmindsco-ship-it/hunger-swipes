'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Ban, CheckCircle2, Clock3, ExternalLink, LogOut, MapPin, Phone, Plus, Timer, ToggleLeft, ToggleRight, TrendingUp, Heart, Eye, Utensils } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { getSupabase } from '@/lib/supabase'
import { BrandMark, SellerTypeIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ImageFallback } from '@/app/components/ui/ImageFallback'

export default function SellerDashboardPage() {
  const router = useRouter()
  const [sellerId, setSellerId] = useState<string | null | undefined>(undefined)
  const [seller, setSeller] = useState<any>(null)
  const [dishes, setDishes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [referrals, setReferrals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSellerId(params.get('id'))
  }, [])

  useEffect(() => {
    if (sellerId === undefined) return
    loadData()
  }, [sellerId])

  const loadData = async () => {
    setLoading(true)
    try {
      const sellerRes = await authFetch(sellerId ? `/api/sellers?id=${sellerId}` : '/api/sellers?mine=true')
      const sellerData = await sellerRes.json()
      if (sellerRes.status === 401) {
        router.replace('/auth?next=%2Fseller%2Fdashboard')
        return
      }
      if (!sellerData.seller) {
        setSeller(null)
        setLoading(false)
        return
      }
      const ownedSellerId = sellerData.seller.id
      const [dishesRes, statsRes, refRes] = await Promise.all([
        authFetch(`/api/sellers/${ownedSellerId}/dishes`),
        authFetch(`/api/sellers/${ownedSellerId}/stats`),
        authFetch(`/api/sellers/${ownedSellerId}/referrals`),
      ])
      const dishesData = await dishesRes.json()
      const statsData = await statsRes.json()
      const refData = await refRes.json()
      setSeller(sellerData.seller)
      if (dishesData.dishes) setDishes(dishesData.dishes)
      if (statsData.stats) setStats(statsData.stats)
      if (refData.stats) setReferrals(refData.stats)
    } catch {
      router.replace('/auth?next=%2Fseller%2Fdashboard')
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (dish: any) => {
    const next = dish.availability === 'available' ? 'unavailable' : 'available'
    await authFetch(`/api/dishes?id=${dish.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: next }),
    })
    loadData()
  }

  const logout = async () => {
    await getSupabase()?.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hungerswipes_user')
    }
    router.replace('/auth?next=%2Fseller%2Fdashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Seller Dashboard</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your dashboard…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Seller Dashboard</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <EmptyState
            icon={<SellerTypeIcon type="restaurant" size={48} className="text-hs-gold" />}
            title="No seller profile found"
            body="Create a seller listing to start posting dishes."
            action={
              <Link
                href="/join"
                className="px-8 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
              >
                Create one
              </Link>
            }
          />
        </main>
        <MobileNav />
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hungerswipes.com'
  const joinUrl = seller ? `${appUrl}/join?ref=${seller.id}` : `${appUrl}/join`
  const StatusIcon = seller.status === 'active' ? CheckCircle2 : seller.status === 'suspended' ? Ban : Timer

  const statusColor = seller.status === 'active' ? 'text-hs-success' : seller.status === 'suspended' ? 'text-hs-red' : 'text-hs-gold'
  const statusBg = seller.status === 'active' ? 'bg-hs-success/10 border-hs-success/20' : seller.status === 'suspended' ? 'bg-hs-red/10 border-hs-red/20' : 'bg-hs-gold/10 border-hs-gold/20'

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/swipe"
              className="text-xs text-hs-gray hover:text-hs-cream flex items-center gap-1 transition"
            >
              <ExternalLink size={14} /> Preview
            </Link>
            <button
              onClick={logout}
              className="inline-flex min-h-11 items-center gap-1.5 text-xs text-hs-gray hover:text-hs-cream transition"
            >
              <LogOut size={15} aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Status */}
        <div className={`rounded-[1.5rem] p-4 flex items-center justify-between border ${statusBg}`}>
          <div className="flex items-center gap-2">
            <StatusIcon size={20} className={statusColor} aria-hidden="true" />
            <p className={`text-sm font-bold capitalize ${statusColor}`}>
              {seller.status.replace('_', ' ')}
            </p>
          </div>
          {seller.seller_type === 'home_kitchen' && seller.verification_status !== 'approved' && (
            <p className="text-xs text-hs-gold">Pending verification</p>
          )}
        </div>

        {/* Business summary */}
        <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-hs-cream flex items-center gap-2 leading-tight">
                <SellerTypeIcon type={seller.seller_type} size={24} className="text-hs-gold shrink-0" />
                <span className="truncate">{seller.business_name}</span>
              </h1>
              <p className="text-sm text-hs-gray capitalize mt-1">{seller.seller_type.replace('_', ' ')}</p>
              {seller.description && <p className="text-sm text-hs-gray mt-2 line-clamp-2">{seller.description}</p>}
            </div>
            {seller.logo_url && (
              <img src={seller.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm text-hs-gray">
            {seller.location_text && (
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-hs-gold" /> {seller.location_text}
              </div>
            )}
            {seller.hours_text && (
              <div className="flex items-center gap-2">
                <Clock3 size={15} className="text-hs-gold" aria-hidden="true" /> {seller.hours_text}
              </div>
            )}
            {seller.phone && (
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-hs-gold" /> {seller.phone}
              </div>
            )}
          </div>
        </section>

        {/* Performance */}
        {stats && (
          <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-hs-gold" />
              <h2 className="font-bold text-hs-cream">Performance</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-hs-soft rounded-2xl">
                <div className="flex items-center justify-center gap-1 mb-1 text-hs-cream">
                  <Eye size={16} />
                  <span className="text-xl font-black">{stats.impressions}</span>
                </div>
                <div className="text-[10px] text-hs-gray uppercase tracking-wide">Views</div>
              </div>
              <div className="p-3 bg-hs-soft rounded-2xl">
                <div className="flex items-center justify-center gap-1 mb-1 text-hs-gold">
                  <Heart size={16} />
                  <span className="text-xl font-black">{stats.rightSwipes}</span>
                </div>
                <div className="text-[10px] text-hs-gray uppercase tracking-wide">Wants</div>
              </div>
              <div className="p-3 bg-hs-soft rounded-2xl">
                <div className="text-xl font-black text-hs-cream mb-1">{stats.rightSwipeRate}%</div>
                <div className="text-[10px] text-hs-gray uppercase tracking-wide">Want Rate</div>
              </div>
            </div>
          </section>
        )}

        {/* Dishes */}
        <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-hs-cream">Your Dishes</h2>
            <Link
              href="/seller/dishes/new"
              className="px-4 py-2 bg-hs-gold text-hs-black rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-hs-gold-light transition"
            >
              <Plus size={16} /> Add
            </Link>
          </div>

          {dishes.length === 0 ? (
            <EmptyState
              icon={<Utensils size={32} className="text-hs-gold" />}
              title="No dishes yet"
              body="Add your first dish so people can discover it."
              action={
                <Link
                  href="/seller/dishes/new"
                  className="text-hs-gold text-sm font-semibold hover:text-hs-gold-light transition"
                >
                  Add your first dish
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {dishes.map((dish: any) => (
                <div
                  key={dish.id}
                  className="bg-hs-soft rounded-2xl p-3 flex items-center gap-3"
                >
                  {dish.photo_url ? (
                    <img
                      src={dish.photo_url}
                      alt={dish.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <ImageFallback label="" className="w-16 h-16 rounded-xl shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-hs-cream truncate">{dish.name}</p>
                    <p className="text-sm text-hs-gold font-semibold">${Number(dish.price).toFixed(2)}</p>
                    <p className="text-xs text-hs-gray">{dish.availability === 'available' ? 'Available' : 'Unavailable'}</p>
                  </div>
                  <IconButton
                    label={`${dish.availability === 'available' ? 'Mark unavailable' : 'Mark available'}: ${dish.name}`}
                    onClick={() => toggleAvailability(dish)}
                    className="w-12 h-12 rounded-xl text-3xl hover:bg-hs-graphite transition"
                  >
                    {dish.availability === 'available' ? (
                      <ToggleRight size={32} className="text-hs-success" />
                    ) : (
                      <ToggleLeft size={32} className="text-hs-gray" />
                    )}
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* QR / Referral */}
        <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5 text-center">
          <h2 className="font-bold text-hs-cream mb-1">Your Join QR</h2>
          <p className="text-xs text-hs-gray mb-4">Scan to share your listing</p>
          {referrals && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-hs-soft rounded-2xl p-2">
                <div className="text-lg font-black text-hs-cream">{referrals.scans}</div>
                <div className="text-[10px] text-hs-gray uppercase">Scans</div>
              </div>
              <div className="bg-hs-soft rounded-2xl p-2">
                <div className="text-lg font-black text-hs-cream">{referrals.signups}</div>
                <div className="text-[10px] text-hs-gray uppercase">Signups</div>
              </div>
              <div className="bg-hs-soft rounded-2xl p-2">
                <div className="text-lg font-black text-hs-cream">{referrals.sellers_created}</div>
                <div className="text-[10px] text-hs-gray uppercase">Joined</div>
              </div>
            </div>
          )}
          <div className="bg-hs-cream p-3 rounded-2xl inline-block">
            <QRCodeSVG value={joinUrl} size={160} bgColor="#FAF9F6" fgColor="#0A0A0A" />
          </div>
          <p className="text-xs text-hs-muted mt-4 break-all px-2">{joinUrl}</p>
        </section>
      </main>
      <MobileNav />
    </div>
  )
}
