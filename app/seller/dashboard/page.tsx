'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Ban, CheckCircle2, Clock3, ExternalLink, LogOut, MapPin, Pencil, Phone, Plus, Timer, ToggleLeft, ToggleRight, TrendingUp, Heart, Eye, Utensils, Lock, RefreshCw } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { getSupabase } from '@/lib/supabase'
import { BrandMark, SellerTypeIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ImageFallback } from '@/app/components/ui/ImageFallback'
import Head from 'next/head'
import TutorialCoachMark, { type TutorialStep } from '@/app/components/TutorialCoachMark'

const SELLER_INTRO_KEY = 'hs_seller_intro_v1'
const STAFF_UPLOAD_ENABLED = false
const SELLER_INTRO_STEPS: TutorialStep[] = [
  { targetId: 'seller-readiness', title: 'Finish your profile', body: 'The checklist shows what is still needed before your listing can be reviewed.', placement: 'below' },
  { targetId: 'seller-add-dish', title: 'Add your first dish', body: 'Post a clear food photo, name, and price. Every dish is reviewed before it goes live.', placement: 'above' },
  { targetId: 'seller-review-status', title: 'We review, then you go live', body: 'Your status appears here after review. You can keep preparing your listing while you wait.', placement: 'below' },
]

function sellerTypesFor(seller: any): string[] {
  return Array.isArray(seller?.seller_types) && seller.seller_types.length
    ? seller.seller_types
    : [seller?.seller_type].filter(Boolean)
}

function readinessChecklist(seller: any) {
  const checks = []
  const has = (v: any) => typeof v === 'string' && v.trim().length > 0
  const types = sellerTypesFor(seller)
  const recipeOnly = types.includes('recipe_creator') && types.length === 1
  const homeCook = types.includes('home_cook') || types.includes('home_kitchen')

  checks.push({ label: recipeOnly ? 'Creator name' : homeCook ? 'Kitchen or cook name' : 'Business name', ok: has(seller.business_name) })
  if (recipeOnly) return { allReady: checks.every((check) => check.ok), checks }

  if (homeCook) {
    checks.push({ label: 'Service area', ok: has(seller.location_text) })
    return { allReady: checks.every((check) => check.ok), checks }
  }

  checks.push({ label: 'Contact name', ok: has(seller.contact_name) })
  checks.push({ label: 'Contact email', ok: has(seller.contact_email) })
  checks.push({ label: 'Address', ok: has(seller.address) })
  checks.push({ label: 'Display location', ok: has(seller.location_text) })
  const orderingMethod = seller.ordering_method || 'none'
  const hasOrderingUrl = orderingMethod === 'link' && has(seller.ordering_url)
  const hasPhone = orderingMethod === 'phone' && has(seller.phone)
  const hasInApp = orderingMethod === 'in_app'
  const orderingReady = orderingMethod !== 'none' && (hasOrderingUrl || hasPhone || hasInApp)
  checks.push({ label: 'Ordering method configured', ok: orderingReady, detail: orderingMethod === 'none' ? 'Choose phone, link, or in-app ordering' : undefined })
  const offersFulfillment = seller.pickup_available || seller.delivery_available
  if (offersFulfillment && !orderingReady) {
    checks.push({ label: 'Pickup / delivery must have ordering method', ok: false, detail: 'Add a phone or order link before offering pickup/delivery' })
  } else {
    checks.push({ label: 'Pickup / delivery settings', ok: true })
  }
  const allReady = checks.every((c) => c.ok)
  return { allReady, checks }
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const [sellerId, setSellerId] = useState<string | null | undefined>(undefined)
  const [seller, setSeller] = useState<any>(null)
  const [dishes, setDishes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [referrals, setReferrals] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [staffPin, setStaffPin] = useState<string | null>(null)
  const [hasStaffPin, setHasStaffPin] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [showSellerIntro, setShowSellerIntro] = useState(false)
  const sellerIntroChecked = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSellerId(params.get('id'))
  }, [])

  useEffect(() => {
    if (sellerId === undefined) return
    loadData()
  }, [sellerId])

  useEffect(() => {
    if (loading || !seller || seller.status === 'active' || sellerIntroChecked.current) return
    sellerIntroChecked.current = true
    let seen = false
    try { seen = localStorage.getItem(SELLER_INTRO_KEY) === 'true' } catch {}
    if (seen) return
    const timer = window.setTimeout(() => setShowSellerIntro(true), 500)
    return () => window.clearTimeout(timer)
  }, [loading, seller])

  const closeSellerIntro = useCallback(() => setShowSellerIntro(false), [])

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
      const [dishesRes, statsRes, refRes, pinRes] = await Promise.all([
        authFetch(`/api/sellers/${ownedSellerId}/dishes`),
        authFetch(`/api/sellers/${ownedSellerId}/stats`),
        authFetch(`/api/sellers/${ownedSellerId}/referrals`),
        authFetch('/api/sellers/staff-pin'),
      ])
      const dishesData = await dishesRes.json()
      const statsData = await statsRes.json()
      const refData = await refRes.json()
      const pinData = await pinRes.json().catch(() => ({ hasPin: false }))
      setSeller(sellerData.seller)
      if (dishesData.dishes) setDishes(dishesData.dishes)
      if (statsData.stats) setStats(statsData.stats)
      if (refData.stats) setReferrals(refData.stats)
      setHasStaffPin(pinData.hasPin)
      if (!pinData.hasPin) setStaffPin(null)
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

  const regenerateStaffPin = async () => {
    setPinLoading(true)
    try {
      const res = await authFetch('/api/sellers/staff-pin', { method: 'POST' })
      const data = await res.json()
      if (data.pin) {
        setStaffPin(data.pin)
        setHasStaffPin(true)
      }
    } finally {
      setPinLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
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
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
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
  const restaurantUrl = seller?.slug ? `${appUrl}/${seller.slug}` : joinUrl
  const publicUrl = seller?.slug ? `${appUrl}/${seller.slug}` : null
  const staffUrl = seller?.slug ? `${appUrl}/seller/staff/${seller.slug}` : null
  const sellerTypes = sellerTypesFor(seller)
  const isRecipeOnly = sellerTypes.includes('recipe_creator') && sellerTypes.length === 1
  const readiness = readinessChecklist(seller)
  const completedSteps = readiness.checks.filter((check) => check.ok).length
  const completionPercent = Math.round((completedSteps / readiness.checks.length) * 100)
  const remainingSteps = readiness.checks.filter((check) => !check.ok)
  const publishedDish = dishes.find((d: any) => d.status === 'active' && d.availability === 'available' && d.photo_url)
  const awaitingReview = readiness.allReady && (seller.status !== 'active' || seller.verification_status === 'pending')
  const displayStatus = !readiness.allReady
    ? { label: 'Setup in progress', Icon: Timer, color: 'text-hs-gold', bg: 'bg-hs-gold/10 border-hs-gold/20' }
    : awaitingReview
      ? { label: 'Submitted · awaiting review', Icon: Clock3, color: 'text-hs-gold', bg: 'bg-hs-gold/10 border-hs-gold/20' }
      : seller.status === 'active'
      ? { label: 'Live', Icon: CheckCircle2, color: 'text-hs-success', bg: 'bg-hs-success/10 border-hs-success/20' }
      : { label: 'Not active', Icon: Ban, color: 'text-hs-red', bg: 'bg-hs-red/10 border-hs-red/20' }
  const DisplayStatusIcon = displayStatus.Icon

  return (
    <>
      <Head>
        <title>Seller Dashboard — Hunger Swipes</title>
        <meta name="description" content="Manage your seller listing, dishes, and performance." />
      </Head>
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            {seller?.slug && publishedDish ? (
              <Link
                href={`/${seller.slug}`}
                className="text-xs text-hs-gray hover:text-hs-cream flex items-center gap-1 transition"
              >
                <ExternalLink size={14} /> Preview
              </Link>
            ) : null}
            <button
              onClick={logout}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-hs-gray hover:bg-hs-soft hover:text-hs-cream transition"
            >
              <LogOut size={15} aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Status + readiness */}
        <div id="seller-review-status" className={`rounded-[1.5rem] p-4 flex items-center justify-between border ${displayStatus.bg}`}>
          <div className="flex items-center gap-2">
            <DisplayStatusIcon size={20} className={displayStatus.color} aria-hidden="true" />
            <p className={`text-sm font-bold ${displayStatus.color}`}>
              {displayStatus.label}
            </p>
          </div>
          {seller.seller_type === 'home_kitchen' && seller.verification_status !== 'approved' && (
            <p className="text-xs text-hs-gold">Pending verification</p>
          )}
        </div>

        {!readiness.allReady && (
          <section id="seller-readiness" className="bg-hs-gold/10 border border-hs-gold/20 rounded-[1.5rem] p-5">
            <div className="flex items-end justify-between gap-4 mb-3">
              <div>
                <h2 className="text-sm font-bold text-hs-cream">Complete your seller setup</h2>
                <p className="mt-1 text-xs text-hs-gray">{remainingSteps.length} {remainingSteps.length === 1 ? 'step' : 'steps'} left before your listing can go live.</p>
              </div>
              <p className="text-xl font-black text-hs-gold">{completionPercent}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-label="Seller setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent}>
              <div className="h-full rounded-full bg-hs-gold transition-[width]" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-3 text-xs text-hs-gray">Next: <span className="font-semibold text-hs-cream">{remainingSteps[0]?.label}</span>{remainingSteps.length > 1 ? ` + ${remainingSteps.length - 1} more` : ''}</p>
            <Link href="/seller/profile" className="mt-4 block w-full py-3 rounded-xl bg-hs-gold text-hs-black text-sm font-bold text-center hover:bg-hs-gold-light transition">
              Finish seller setup
            </Link>
          </section>
        )}

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
          <Link href="/seller/profile" className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-hs-soft text-sm font-bold text-hs-cream hover:border-hs-gold/30">
            <Pencil size={16} /> {isRecipeOnly ? 'Edit creator profile' : sellerTypes.includes('home_cook') || sellerTypes.includes('home_kitchen') ? 'Edit cook profile' : 'Edit restaurant and ordering'}
          </Link>
          {seller.slug && <p className="mt-3 text-center text-xs text-hs-muted">Public page: hungerswipes.com/{seller.slug}</p>}
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
            <h2 className="font-bold text-hs-cream">{seller.seller_types?.includes('recipe_creator') ? 'Your Dishes & Meals' : 'Your Dishes'}</h2>
            <Link
              id="seller-add-dish"
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
                    <p className={`text-xs font-semibold ${
                      dish.status === 'active'
                        ? dish.availability === 'available' ? 'text-hs-success' : 'text-hs-gray'
                        : dish.status === 'pending' ? 'text-hs-gold' : 'text-hs-red'
                    }`}>
                      {dish.status === 'active'
                        ? dish.availability === 'available' ? 'Live · Available' : 'Live · Unavailable'
                        : dish.status === 'pending' ? 'Awaiting admin approval' : 'Not published'}
                    </p>
                  </div>
                  <IconButton
                    label={`${dish.availability === 'available' ? 'Mark unavailable' : 'Mark available'}: ${dish.name}`}
                    onClick={() => toggleAvailability(dish)}
                    disabled={dish.status !== 'active'}
                    className="w-12 h-12 rounded-xl text-3xl hover:bg-hs-graphite transition"
                  >
                    {dish.status === 'active' && dish.availability === 'available' ? (
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

        {/* Recipes */}
        {sellerTypes.includes('recipe_creator') && (
          <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SellerTypeIcon type="recipe_creator" size={18} className="text-hs-gold" />
                <h2 className="font-bold text-hs-cream">Your Recipes</h2>
              </div>
              <Link
                href="/seller/recipes/new"
                className="px-4 py-2 bg-hs-gold text-hs-black rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-hs-gold-light transition"
              >
                <Plus size={16} /> Add
              </Link>
            </div>
            <p className="text-sm text-hs-gray">
              Share a free recipe with ingredients and step-by-step instructions. Paid recipes are coming later.
            </p>
          </section>
        )}

        {/* Staff Upload QR + PIN */}
        {STAFF_UPLOAD_ENABLED && staffUrl && !isRecipeOnly && (
          <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Lock size={16} className="text-hs-gold" />
              <h2 className="font-bold text-hs-cream">Staff Upload QR</h2>
            </div>
            <p className="text-xs text-hs-gray mb-4">Staff scan to add dishes from their phone</p>

            {staffPin ? (
              <div className="bg-hs-gold/10 border border-hs-gold/20 rounded-2xl p-4 mb-4">
                <p className="text-xs text-hs-gold uppercase tracking-wider mb-1">Current staff PIN</p>
                <p className="text-3xl font-black text-hs-cream tracking-[0.25em]">{staffPin}</p>
                <p className="text-xs text-hs-gray mt-2">Give this PIN to staff. They enter it after scanning the QR.</p>
              </div>
            ) : hasStaffPin ? (
              <p className="text-xs text-hs-gray mb-4">PIN is set. Regenerate to view a new PIN.</p>
            ) : (
              <p className="text-xs text-hs-gray mb-4">No staff PIN yet. Generate one to enable staff uploads.</p>
            )}

            <div className="bg-hs-cream p-3 rounded-2xl inline-block mb-3">
              <QRCodeSVG value={staffUrl} size={160} bgColor="#FAF9F6" fgColor="#0A0A0A" />
            </div>
            <p className="text-xs text-hs-muted break-all px-2 mb-4">{staffUrl}</p>

            <button
              onClick={regenerateStaffPin}
              disabled={pinLoading}
              className="w-full py-3 border border-white/[0.08] bg-hs-charcoal text-hs-cream rounded-2xl font-semibold inline-flex items-center justify-center gap-2 hover:bg-hs-soft transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={pinLoading ? 'animate-spin' : ''} />
              {pinLoading ? 'Generating…' : hasStaffPin ? 'Regenerate Staff PIN' : 'Generate Staff PIN'}
            </button>
          </section>
        )}

        {/* Public Restaurant QR */}
        {publicUrl && (
          <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5 text-center">
            <h2 className="font-bold text-hs-cream mb-1">Your Restaurant QR</h2>
            <p className="text-xs text-hs-gray mb-4">Customers scan to see your dishes</p>
            <div className="bg-hs-cream p-3 rounded-2xl inline-block">
              <QRCodeSVG value={publicUrl} size={160} bgColor="#FAF9F6" fgColor="#0A0A0A" />
            </div>
            <p className="text-xs text-hs-muted mt-4 break-all px-2">{publicUrl}</p>
            <p className="text-xs text-hs-gray mt-2">
              Status: <span className={seller.status === 'active' ? 'text-hs-success' : 'text-hs-gold'}>{seller.status.replace('_', ' ')}</span>
            </p>
          </section>
        )}

        {/* Seller referral QR */}
        <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5 text-center">
          <h2 className="font-bold text-hs-cream mb-1">Restaurant Referral QR</h2>
          <p className="text-xs text-hs-gray mb-4">Invite another food business</p>
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
      <TutorialCoachMark open={showSellerIntro} steps={SELLER_INTRO_STEPS} storageKey={SELLER_INTRO_KEY} onClose={closeSellerIntro} />
    </div>
    </>
  )
}
