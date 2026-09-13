'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, DollarSign, Phone, CheckCircle, Camera, Upload } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { authFetch } from '@/lib/auth-fetch'
import { getSupabase } from '@/lib/supabase'

const SELLER_TYPES = [
  { value: 'restaurant', label: '🍽️ Restaurant' },
  { value: 'home_kitchen', label: '🏠 Home Kitchen' },
  { value: 'food_truck', label: '🚚 Food Truck' },
  { value: 'caterer', label: '🎉 Caterer' },
  { value: 'pop_up', label: '🎪 Pop-Up' },
  { value: 'meal_prep', label: '🥗 Meal Prep' },
  { value: 'other', label: '🍴 Other' },
]

const ORDERING_METHODS = [
  { value: 'phone', label: '📞 Phone' },
  { value: 'link', label: '🔗 Order Link' },
  { value: 'in_app', label: '📱 In-App (coming)' },
  { value: 'none', label: '👋 Tell them in person' },
]

function JoinContent() {
  const params = useSearchParams()
  const router = useRouter()
  const prefillType = params.get('seller_type') || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [logoPreview, setLogoPreview] = useState('')

  const [form, setForm] = useState({
    business_name: '',
    seller_type: prefillType || 'restaurant',
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
    const checkAuth = async () => {
      const supabase = getSupabase()
      const { data } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } }
      if (!data.session) {
        const next = `/join${prefillType ? `?seller_type=${encodeURIComponent(prefillType)}` : ''}`
        router.replace(`/auth?next=${encodeURIComponent(next)}`)
        return
      }
      setAuthChecking(false)
    }
    checkAuth()

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // We only use location text for display; coordinates are optional
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      )
    }
  }, [])

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
      const res = await authFetch('/api/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const joinUrl = `${appUrl}/join`
  const dashboardUrl = seller ? `${appUrl}/seller/dashboard` : appUrl

  if (authChecking) {
    return <div className="min-h-screen flex items-center justify-center">Checking your account...</div>
  }

  if (submitted && seller) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div className="w-9 h-9 bg-[#FF5722] rounded-lg flex items-center justify-center font-black text-white text-xs">HS</div>
            <span className="font-bold text-gray-900">HungerSwipes</span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-white" />
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
            href="/seller/dashboard"
            className="block w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold text-center hover:bg-[#e64a19] transition mb-3"
          >
            Add Your First Dish →
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
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="w-9 h-9 bg-[#FF5722] rounded-lg flex items-center justify-center font-black text-white text-xs">HS</div>
          <span className="font-bold text-gray-900">Join Hunger Swipes</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
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
                    className={`p-3 rounded-xl border text-sm font-medium transition ${
                      form.seller_type === t.value ? 'border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Location / where to find you *</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  value={form.location_text}
                  onChange={(e) => setForm({ ...form, location_text: e.target.value })}
                  placeholder="Ex: Soulard, St. Louis"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Phone / contact</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (314) 555-1234"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.business_name || !form.location_text}
              className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Short description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Smoked brisket, pulled pork, mac & cheese..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Hours</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input
                  value={form.hours_text}
                  onChange={(e) => setForm({ ...form, hours_text: e.target.value })}
                  placeholder="Ex: Mon–Sat 11am–8pm"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">How can customers order?</label>
              <div className="grid grid-cols-2 gap-2">
                {ORDERING_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setForm({ ...form, ordering_method: m.value })}
                    className={`p-3 rounded-xl border text-sm font-medium transition ${
                      form.ordering_method === m.value ? 'border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {form.ordering_method === 'link' && (
              <div>
                <label className="block text-sm font-semibold mb-2">Order link</label>
                <input
                  value={form.ordering_url}
                  onChange={(e) => setForm({ ...form, ordering_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            )}

            <div className="flex gap-3">
              <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-3 flex-1">
                <input
                  type="checkbox"
                  checked={form.pickup_available}
                  onChange={(e) => setForm({ ...form, pickup_available: e.target.checked })}
                />
                <span className="text-sm">Pickup</span>
              </label>
              <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-3 flex-1">
                <input
                  type="checkbox"
                  checked={form.delivery_available}
                  onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })}
                />
                <span className="text-sm">Delivery</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Logo / photo</label>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#FF5722] transition">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl mx-auto" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <Upload size={24} />
                      <span className="text-sm">Tap to upload logo</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-white border border-gray-200 rounded-xl font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-4 bg-[#FF5722] text-white rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? 'Creating...' : '🔥 Go Live'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <JoinContent />
    </Suspense>
  )
}
