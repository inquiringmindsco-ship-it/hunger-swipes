'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ExternalLink, Hand, MapPin, Phone, Search, Smartphone, Upload, ChevronRight, Utensils, ChefHat, ScrollText } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { authFetch } from '@/lib/auth-fetch'
import { apiFetch } from '@/lib/auth-fetch'
import { getSupabase } from '@/lib/supabase'
import { BrandMark, GetItIcon, SellerTypeIcon, WantItIcon } from '@/app/components/icons/HungerIcons'
import { LoadingState } from '@/app/components/ui/LoadingState'
import MobileNav from '@/app/components/MobileNav'

const SELLER_TYPES = [
  { value: 'restaurant', label: 'Restaurant / Food Business', description: 'Restaurants, food trucks, bakeries, caterers', icon: Utensils },
  { value: 'home_cook', label: 'Home Cook', description: 'Sell your own prepared food where permitted', icon: ChefHat },
  { value: 'recipe_creator', label: 'Recipe Creator', description: 'Share food and publish the recipe behind it', icon: ScrollText },
]

const RESTAURANT_SUB_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'caterer', label: 'Caterer' },
  { value: 'pop_up', label: 'Pop-Up' },
  { value: 'meal_prep', label: 'Meal Prep' },
  { value: 'other', label: 'Other' },
]

const ORDERING_METHODS = [
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'link', label: 'Order Link', icon: ExternalLink },
  { value: 'in_app', label: 'In-App (coming)', icon: Smartphone },
  { value: 'none', label: 'In person', icon: Hand },
]

function normalizeSellerTypes(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : [input]
  const valid = new Set(['restaurant','home_kitchen','home_cook','food_truck','caterer','pop_up','meal_prep','recipe_creator','other'])
  return Array.from(new Set(raw.filter((t) => valid.has(t))))
}

export default function JoinPage() {
  const router = useRouter()
  const [prefillType, setPrefillType] = useState('')
  const [refSellerId, setRefSellerId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hungerswipes.com'

  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    seller_type: '',
    seller_types: [] as string[],
    description: '',
    location_text: '',
    address: '',
    website_url: '',
    phone: '',
    hours_text: '',
    pickup_available: true,
    delivery_available: false,
    ordering_method: 'phone',
    ordering_url: '',
    logo_url: '',
  })

  const selectedSellerType = form.seller_types[0] || ''
  const isRecipeCreator = selectedSellerType === 'recipe_creator'
  const isHomeCook = selectedSellerType === 'home_cook'
  const isRestaurant = !!selectedSellerType && !isRecipeCreator && !isHomeCook
  const profileNameLabel = isRecipeCreator ? 'Creator name' : isHomeCook ? 'Kitchen or cook name' : 'Business name'
  const profileNamePlaceholder = isRecipeCreator ? 'Ex: Recipes by Maya' : isHomeCook ? 'Ex: Maya’s Sunday Kitchen' : "Ex: Mama's Tacos"

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const st = params.get('seller_type') || ''
    const ref = params.get('ref')
    setPrefillType(st)
    setRefSellerId(ref)
    const savedIntake = sessionStorage.getItem('hungerswipes_business_intake')
    if (savedIntake) {
      try {
        const intake = JSON.parse(savedIntake)
        const normalized = normalizeSellerTypes('restaurant')
        setForm((current) => ({ ...current, ...intake, contact_email: intake.email || '', website_url: intake.website || '', seller_type: 'restaurant', seller_types: normalized }))
      } catch {}
    }
    const savedDraft = sessionStorage.getItem('hungerswipes_join_draft_v1')
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        if (draft?.form) setForm((current) => ({ ...current, ...draft.form }))
        if (draft?.step === 2) setStep(2)
      } catch {}
    }
    if (st) {
      const normalized = normalizeSellerTypes(st)
      setForm((current) => ({ ...current, seller_type: normalized[0] || 'restaurant', seller_types: normalized }))
    }
    setDraftReady(true)

    // Record scan if this page was opened via a seller's QR
    if (ref) {
      apiFetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: ref, event_type: 'scan' }),
      }).catch(() => {})
    }

    const checkAuthAndSeller = async () => {
      const supabase = getSupabase()
      const { data } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } }
      if (!data.session) {
        const query = new URLSearchParams()
        if (st) query.set('seller_type', st)
        if (ref) query.set('ref', ref)
        const next = `/join${query.toString() ? '?' + query.toString() : ''}`
        router.replace(`/auth?next=${encodeURIComponent(next)}`)
        return
      }
      try {
        const res = await authFetch('/api/sellers?mine=true')
        const data = await res.json()
        if (data.seller?.id) {
          router.replace(`/seller/dashboard?id=${data.seller.id}`)
          return
        }
      } catch {
        // Let them create seller
      }
      setAuthChecking(false)
    }

    checkAuthAndSeller()

    // /join intentionally does NOT request browser location automatically.
    // Location is only requested after the user explicitly chooses Nearby, Near Me, or Use My Location.
  }, [router])

  useEffect(() => {
    if (!draftReady || submitted || typeof window === 'undefined') return
    const timeout = window.setTimeout(() => {
      sessionStorage.setItem('hungerswipes_join_draft_v1', JSON.stringify({ form, step }))
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [draftReady, form, step, submitted])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'seller-logos')
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setForm((f) => ({ ...f, logo_url: data.url }))
    } catch {}
  }

  const handleSubmit = async () => {
    if (!selectedSellerType) {
      alert('Choose how you want to sell or share food.')
      return
    }
    if (!form.business_name.trim()) {
      alert(`${profileNameLabel} is required.`)
      return
    }
    if (isRestaurant && (!form.contact_name.trim() || !form.contact_email.trim() || !form.address.trim() || !form.location_text.trim())) {
      alert('Business name, contact name, email, address, and location are required for restaurants and food businesses.')
      return
    }
    if (isHomeCook && !form.location_text.trim()) {
      alert('Add the neighborhood or service area where people can find your food.')
      return
    }
    setLoading(true)
    try {
      const body: any = {
        ...form,
        ...(isRecipeCreator ? {
          address: '', location_text: '', phone: '', hours_text: '', ordering_method: 'none', ordering_url: '', pickup_available: false, delivery_available: false,
        } : {}),
      }
      if (refSellerId) body.referred_by = refSellerId
      const res = await authFetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.seller) {
        sessionStorage.removeItem('hungerswipes_business_intake')
        sessionStorage.removeItem('hungerswipes_join_draft_v1')
        setSeller(data.seller)
        setSubmitted(true)
      } else {
        alert(data.error || 'Failed to create seller')
      }
    } catch (e) {
      alert('Network error')
    }
    setLoading(false)
  }

  const goToStepTwo = () => {
    if (!selectedSellerType) return alert('Choose Restaurant, Home Cook, or Recipe Creator first.')
    if (!form.business_name.trim()) return alert(`${profileNameLabel} is required.`)
    if (isRestaurant && (!form.contact_name.trim() || !form.contact_email.trim() || !form.address.trim() || !form.location_text.trim())) {
      return alert('Complete the restaurant contact and location fields before continuing.')
    }
    if (isHomeCook && !form.location_text.trim()) return alert('Add your neighborhood or service area before continuing.')
    setStep(2)
  }

  const joinUrl = `${appUrl}/join${refSellerId ? `?ref=${refSellerId}` : ''}`
  const dashboardUrl = seller ? `${appUrl}/seller/dashboard?id=${seller.id}` : appUrl
  const restaurantUrl = seller?.slug ? `${appUrl}/${seller.slug}` : appUrl

  if (authChecking) {
    return (
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Sell on Hunger Swipes</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Checking your account…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (submitted && seller) {
    return (
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Welcome to Hunger Swipes</span>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-hs-gold" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black text-hs-cream mb-2">{isRecipeCreator ? 'Your creator profile is ready!' : 'You’re on Hunger Swipes!'}</h1>
          <p className="text-hs-gray text-sm mb-6">{isRecipeCreator ? `${form.business_name} can now start sharing recipes.` : `${form.business_name} is ready to be discovered.`}</p>

          {seller.status === 'pending_review' && (
            <div className="rounded-2xl border border-hs-gold/20 bg-hs-gold/10 p-4 mb-6 text-left">
              <p className="text-sm text-hs-gold font-medium">
                {isRecipeCreator ? 'Your creator profile is pending review. You can prepare recipes now, and they will appear after approval.' : 'Your seller profile is pending review. You can add dishes now, but they stay hidden until an admin approves your profile.'}
              </p>
            </div>
          )}

          {seller.status === 'active' ? <div className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-6 mb-6">
            <h2 className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-4 text-left">Your QR Code</h2>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={restaurantUrl} size={180} bgColor="#141414" fgColor="#D4AF37" />
            </div>
            <p className="text-xs text-hs-gray text-center mb-4">Scan to open your permanent {isRecipeCreator ? 'creator' : 'food'} page</p>
            <div className="bg-hs-soft rounded-xl p-3 text-left">
              <p className="text-xs text-hs-gray mb-1">Your permanent {isRecipeCreator ? 'creator' : 'food'} page:</p>
              <p className="text-sm font-mono text-hs-gold break-all">{restaurantUrl}</p>
              <p className="mt-3 text-xs text-hs-gray mb-1">Your private dashboard:</p>
              <p className="text-xs font-mono text-hs-silver break-all">{dashboardUrl}</p>
            </div>
          </div> : <div className="mb-6 rounded-[1.5rem] border border-white/[0.06] bg-hs-charcoal p-6 text-left"><h2 className="font-bold text-hs-cream">Public page after approval</h2><p className="mt-2 text-sm text-hs-gray">Your link and QR code will turn on after the profile is reviewed. You can prepare your first {isRecipeCreator ? 'recipe' : 'dish'} now.</p></div>}

          <Link
            href={isRecipeCreator ? '/seller/dishes/new?continue=recipe' : '/seller/dishes/new'}
            className="block w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-center hover:bg-hs-gold-light transition mb-3"
          >
            <span className="inline-flex items-center gap-2 justify-center">
              {isRecipeCreator ? 'Publish Your First Recipe' : 'Add Your First Dish'} <ArrowRight size={18} aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/swipe"
            className="block w-full py-3 border border-white/[0.08] text-hs-cream rounded-2xl font-semibold text-center hover:bg-hs-charcoal transition"
          >
            Preview the App
          </Link>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">Sell on Hunger Swipes</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: 'Your path' },
            { n: 2, label: isRecipeCreator ? 'Creator profile' : 'How it works' },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step >= n ? 'bg-hs-gold text-hs-black' : 'bg-hs-soft text-hs-gray'
              }`}>
                {n}
              </div>
              <span className={`text-xs font-medium ${step >= n ? 'text-hs-cream' : 'text-hs-gray'}`}>{label}</span>
              {i < 1 && <ChevronRight size={14} className="text-hs-soft" />}
            </div>
          ))}
        </div>

        <section aria-label="How Hunger Swipes works" className="grid grid-cols-4 gap-2 mb-8">
          {[
            { label: 'Post', icon: Upload },
            { label: 'Get found', icon: Search },
            { label: 'People want', icon: WantItIcon },
            { label: 'They get it', icon: GetItIcon },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-hs-charcoal px-2 py-4 text-center">
              <Icon size={20} className="mx-auto mb-2 text-hs-gold" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-hs-gray">{label}</p>
            </div>
          ))}
        </section>

        {step === 1 ? (
          <div className="space-y-6">
            <section>
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">How do you want to show up? *</label>
              <div className="grid gap-3">
                {SELLER_TYPES.map((t) => {
                  const Icon = t.icon
                  const selected = selectedSellerType === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, seller_type: t.value, seller_types: [t.value] })}
                      aria-pressed={selected}
                      className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                        selected
                          ? 'border-hs-gold bg-hs-gold/10 text-hs-gold'
                          : 'border-white/[0.06] bg-hs-charcoal text-hs-cream hover:bg-hs-soft'
                      }`}
                    >
                      <div className={`rounded-xl p-2 ${selected ? 'bg-hs-gold/20' : 'bg-hs-soft'}`}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{t.label}</p>
                        <p className={`text-xs mt-0.5 ${selected ? 'text-hs-gold/80' : 'text-hs-gray'}`}>{t.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? 'border-hs-gold bg-hs-gold' : 'border-hs-gray'}`}>
                        {selected && <CheckCircle2 size={12} className="text-hs-black" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedSellerType === 'restaurant' && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-hs-silver uppercase tracking-wider mb-2 block">Food business type</label>
                  <div className="flex flex-wrap gap-2">
                    {RESTAURANT_SUB_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, seller_type: t.value, seller_types: normalizeSellerTypes([...form.seller_types.filter((x) => !RESTAURANT_SUB_TYPES.some((s) => s.value === x)), t.value]) })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                          form.seller_type === t.value
                            ? 'border-hs-gold bg-hs-gold/10 text-hs-gold'
                            : 'border-white/[0.06] bg-hs-charcoal text-hs-cream hover:bg-hs-soft'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {selectedSellerType && <section>
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">{profileNameLabel} *</label>
              <input
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder={profileNamePlaceholder}
                className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
              />
              {isRecipeCreator && <p className="mt-2 text-xs leading-relaxed text-hs-gray">This is the name people will see on your recipes. It can be your name or a creator name—no business is required.</p>}
            </section>}

            {isRestaurant && <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Contact Name *</label>
                <input id="contact-name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Your name" className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition" />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Business Email *</label>
                <input id="contact-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="you@restaurant.com" className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition" />
              </div>
            </section>}

            {!isRecipeCreator && selectedSellerType && <section>
              <label htmlFor="street-address" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">{isHomeCook ? 'Pickup address' : 'Street address *'} {isHomeCook && <span className="font-normal normal-case text-hs-gray">(optional)</span>}</label>
              <input id="street-address" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={isHomeCook ? 'Only if you offer pickup' : 'Restaurant street address'} className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition" />
              {isHomeCook && <p className="mt-2 text-xs text-hs-gray">Your public profile shows your service area, not your full street address.</p>}
            </section>}

            {!isRecipeCreator && selectedSellerType && <section>
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">{isHomeCook ? 'Neighborhood / service area' : 'Location / Where to find you'} *</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-4 text-hs-gray" aria-hidden="true" />
                <input
                  value={form.location_text}
                  onChange={(e) => setForm({ ...form, location_text: e.target.value })}
                  placeholder={isHomeCook ? 'Ex: Tower Grove South, St. Louis' : 'Ex: Delmar Loop, St. Louis'}
                  className="w-full pl-11 pr-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                />
              </div>
            </section>}

            {!isRecipeCreator && selectedSellerType && <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="314-555-0199"
                  className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">{isHomeCook ? 'Availability' : 'Hours'}</label>
                <input
                  value={form.hours_text}
                  onChange={(e) => setForm({ ...form, hours_text: e.target.value })}
                  placeholder={isHomeCook ? 'Ex: Fri–Sun, pre-order 24h' : 'Mon–Sat 11am–9pm'}
                  className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                />
              </div>
            </section>}

            <section>
              <label htmlFor="website" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Website or Social Link <span className="text-hs-gray font-normal normal-case">(optional)</span></label>
              <input id="website" type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://" className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition" />
            </section>

            <button
              onClick={goToStepTwo}
              className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold hover:bg-hs-gold-light transition flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {isRecipeCreator && (
              <section className="rounded-3xl border border-hs-gold/25 bg-hs-gold/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-hs-gold/15 p-3 text-hs-gold"><ScrollText size={24} /></div>
                  <div>
                    <h2 className="font-black text-hs-cream">Share recipes without a storefront</h2>
                    <p className="mt-1 text-sm leading-relaxed text-hs-gray">Publish free recipes with a finished-food photo, measured ingredients, and step-by-step instructions. Paid options are coming later.</p>
                  </div>
                </div>
              </section>
            )}

            {!isRecipeCreator && <section>
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">How do people order?</label>
              <div className="grid grid-cols-2 gap-2">
                {ORDERING_METHODS.map((m) => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.value}
                      onClick={() => setForm({ ...form, ordering_method: m.value })}
                      className={`p-3 rounded-2xl border text-sm font-medium transition flex items-center gap-2 ${
                        form.ordering_method === m.value
                          ? 'border-hs-gold bg-hs-gold/10 text-hs-gold'
                          : 'border-white/[0.06] bg-hs-charcoal text-hs-cream hover:bg-hs-soft'
                      }`}
                    >
                      <Icon size={20} />
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </section>}

            {!isRecipeCreator && form.ordering_method === 'link' && (
              <section>
                <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Order URL</label>
                <input
                  value={form.ordering_url}
                  onChange={(e) => setForm({ ...form, ordering_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                />
              </section>
            )}

            {!isRecipeCreator && <section className="space-y-3">
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider block">Availability</label>
              <label className="flex items-center gap-3 p-4 bg-hs-charcoal rounded-2xl border border-white/[0.06] cursor-pointer">
                <input
                  type="checkbox"
                  id="pickup"
                  checked={form.pickup_available}
                  onChange={(e) => setForm({ ...form, pickup_available: e.target.checked })}
                  className="w-5 h-5 accent-hs-gold rounded"
                />
                <span className="text-sm font-medium text-hs-cream">Pickup available</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-hs-charcoal rounded-2xl border border-white/[0.06] cursor-pointer">
                <input
                  type="checkbox"
                  id="delivery"
                  checked={form.delivery_available}
                  onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })}
                  className="w-5 h-5 accent-hs-gold rounded"
                />
                <span className="text-sm font-medium text-hs-cream">Delivery available</span>
              </label>
            </section>}

            <section>
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">{isRecipeCreator ? 'Creator bio' : 'Description'}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={isRecipeCreator ? 'Tell people what you love to cook and what they can expect from your recipes.' : 'What makes your food special?'}
                rows={3}
                className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition resize-none"
              />
            </section>

            <section>
              <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Logo / Photo <span className="text-hs-gray font-normal normal-case">(optional)</span></label>
              <div className="flex items-center gap-3">
                {logoPreview && <img src={logoPreview} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                <label className="flex-1 py-4 border-2 border-dashed border-white/15 rounded-2xl text-center text-sm text-hs-gray cursor-pointer hover:border-hs-gold/40 hover:text-hs-cream transition"
                >
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  Upload logo
                </label>
              </div>
            </section>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-white/[0.08] text-hs-cream rounded-2xl font-bold hover:bg-hs-charcoal transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-4 bg-hs-gold text-hs-black rounded-2xl font-bold hover:bg-hs-gold-light transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                  {loading ? 'Creating…' : <>{isRecipeCreator ? 'Create Creator Profile' : 'Create Seller Profile'} <CheckCircle2 size={18} /></>}
              </button>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
