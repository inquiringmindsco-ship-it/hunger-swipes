'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ExternalLink, Hand, MapPin, Phone, Search, Smartphone, Upload } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { authFetch } from '@/lib/auth-fetch'
import { getSupabase } from '@/lib/supabase'
import { BrandMark, GetItIcon, SellerTypeIcon, WantItIcon } from '@/app/components/icons/HungerIcons'

const SELLER_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'home_kitchen', label: 'Home Kitchen' },
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hunger-swipes-theta.vercel.app'

  const [form, setForm] = useState({
    business_name: '',
    seller_type: 'restaurant',
    description: '',
    location_text: '',
    address: '',
    phone: '',
    hours_text: '',
    pickup_available: true,
    delivery_available: false,
    ordering_method: 'phone',
    ordering_url: '',
    logo_url: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const st = params.get('seller_type') || ''
    const ref = params.get('ref')
    setPrefillType(st)
    setRefSellerId(ref)
    if (st) setForm((f) => ({ ...f, seller_type: st }))

    // Record scan if this page was opened via a seller's QR
    if (ref) {
      fetch('/api/referrals', {
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

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: false, timeout: 5000 })
    }
  }, [router])

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
    if (!form.business_name || !form.location_text) {
      alert('Business name and location are required.')
      return
    }
    setLoading(true)
    try {
      const body: any = { ...form }
      if (refSellerId) body.referred_by = refSellerId
      const res = await authFetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.seller) {
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

  const joinUrl = `${appUrl}/join${refSellerId ? `?ref=${refSellerId}` : ''}`
  const dashboardUrl = seller ? `${appUrl}/seller/dashboard?id=${seller.id}` : appUrl

  if (authChecking) {
    return <div className="min-h-screen flex items-center justify-center">Checking your account...</div>
  }

  if (submitted && seller) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-gray-900 pb-24">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <BrandMark size={36} />
            <span className="font-bold text-gray-900">HungerSwipes</span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black mb-2">You&apos;re on Hunger Swipes!</h1>
          {seller.status === 'pending_review' && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-2 mb-4">
              Your seller profile is pending review. You can add dishes now, but they stay hidden until an admin approves your profile.
            </p>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 text-left">
            <h2 className="font-bold text-sm text-gray-600 uppercase tracking-wide mb-3">Your QR Code</h2>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <p className="text-xs text-gray-600 text-center mb-4">Scan to share your listing</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-600 mb-1">Your dashboard link:</p>
              <p className="text-sm font-mono text-[#FF5722] break-all">{dashboardUrl}</p>
            </div>
          </div>

          <Link
            href={`/seller/dashboard?id=${seller.id}`}
            className="block w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold text-center hover:bg-[#e64a19] transition mb-3"
          >
            <span className="inline-flex items-center gap-2">Add Your First Dish <ArrowRight size={18} aria-hidden="true" /></span>
          </Link>
          <Link
            href="/swipe"
            className="block w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-center hover:bg-gray-50 transition"
          >
            Preview the App
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <BrandMark size={36} />
          <span className="font-bold text-gray-900">Join Hunger Swipes</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <section aria-label="How Hunger Swipes works" className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'Post food', icon: Upload },
            { label: 'Get discovered', icon: Search },
            { label: 'People swipe', icon: WantItIcon },
            { label: 'People get it', icon: GetItIcon },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white px-2 py-3 text-center shadow-sm">
              <Icon size={21} className="mx-auto mb-1.5 text-[#FF5722]" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-gray-600">{label}</p>
            </div>
          ))}
        </section>

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Business / seller name *</label>
              <input
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="Ex: Mama's Tacos"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">What kind of seller are you? *</label>
              <div className="grid grid-cols-2 gap-2">
                {SELLER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, seller_type: t.value })}
                    aria-pressed={form.seller_type === t.value}
                    className={`min-h-16 p-3 rounded-xl border text-sm font-medium transition flex items-center gap-2 text-left ${
                      form.seller_type === t.value ? 'border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <SellerTypeIcon type={t.value} size={23} className="shrink-0" />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Location / where to find you *</label>
              <div className="relative">
                <MapPin size={17} className="absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
                <input
                  value={form.location_text}
                  onChange={(e) => setForm({ ...form, location_text: e.target.value })}
                  placeholder="Ex: Delmar Loop, St. Louis"
                  className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Phone number</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ex: 314-555-0199"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Hours</label>
              <input
                value={form.hours_text}
                onChange={(e) => setForm({ ...form, hours_text: e.target.value })}
                placeholder="Ex: Mon–Sat 11am–9pm"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#e64a19] transition"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">How do people order?</label>
              <div className="grid grid-cols-2 gap-2">
                {ORDERING_METHODS.map((m) => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.value}
                      onClick={() => setForm({ ...form, ordering_method: m.value })}
                      className={`p-3 rounded-xl border text-sm font-medium transition flex items-center gap-2 ${
                        form.ordering_method === m.value ? 'border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <Icon size={20} />
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {form.ordering_method === 'link' && (
              <div>
                <label className="block text-sm font-semibold mb-2">Order URL</label>
                <input
                  value={form.ordering_url}
                  onChange={(e) => setForm({ ...form, ordering_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="pickup"
                checked={form.pickup_available}
                onChange={(e) => setForm({ ...form, pickup_available: e.target.checked })}
                className="w-5 h-5 accent-[#FF5722]"
              />
              <label htmlFor="pickup" className="text-sm font-medium">Pickup available</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="delivery"
                checked={form.delivery_available}
                onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })}
                className="w-5 h-5 accent-[#FF5722]"
              />
              <label htmlFor="delivery" className="text-sm font-medium">Delivery available</label>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What makes your food special?"
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Logo / photo (optional)</label>
              <div className="flex items-center gap-3">
                {logoPreview && <img src={logoPreview} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                <label className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-xl text-center text-sm text-gray-600 cursor-pointer hover:border-[#FF5722] hover:text-[#FF5722] transition">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  Upload logo
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-4 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#e64a19] transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Seller Profile'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
