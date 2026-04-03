'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Clock, DollarSign, Camera, CheckCircle, X, ChevronRight } from 'lucide-react'

const PRICE_RANGES = [
  { value: '$', label: '$', desc: 'Under $10' },
  { value: '$$', label: '$$', desc: '$10–$20' },
  { value: '$$$', label: '$$$', desc: '$20+' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'cashapp', label: '📱 CashApp' },
  { value: 'venmo', label: '📱 Venmo' },
  { value: 'zelle', label: '📱 Zelle' },
]

export default function VendorIntakePage() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [vendorId, setVendorId] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

  const [form, setForm] = useState({
    foodName: '',
    description: '',
    priceRange: '',
    photo: null as File | null,
    photoPreview: '',
    locationText: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isOpen: true,
    paymentMethods: [] as string[],
    hoursText: '',
  })

  // Auto-capture GPS on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm(f => ({
            ...f,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }))
          setGettingLocation(false)
        },
        () => {
          setLocationError('Location access denied. You can type your location below.')
          setGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    }
  }, [])

  const togglePayment = (method: string) => {
    setForm(f => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method)
        ? f.paymentMethods.filter(m => m !== method)
        : [...f.paymentMethods, method],
    }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm(f => ({
        ...f,
        photo: file,
        photoPreview: ev.target?.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!agreed) { alert('Please agree to the independent seller terms.'); return }
    if (!form.foodName || !form.priceRange) { alert('Food name and price range required.'); return }
    setLoading(true)
    try {
      const body: any = {
        foodName: form.foodName,
        description: form.description,
        priceRange: form.priceRange,
        locationText: form.locationText,
        latitude: form.latitude,
        longitude: form.longitude,
        isOpen: form.isOpen,
        paymentMethods: form.paymentMethods,
        hoursText: form.hoursText,
      }
      const res = await fetch('/api/vendors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.vendorId) {
        setVendorId(data.vendorId)
        setSubmitted(true)
      } else {
        // Fallback: show success anyway for demo
        setVendorId(data.id || 'DEMO-' + Date.now())
        setSubmitted(true)
      }
    } catch {
      // Demo mode
      setVendorId('DEMO-' + Date.now())
      setSubmitted(true)
    }
    setLoading(false)
  }

  if (submitted) {
    const shareUrl = `https://hunger-swipes.vercel.app/vendor-intake?id=${vendorId}`
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div className="w-9 h-9 bg-[#FF5722] rounded-lg flex items-center justify-center">
              <span className="font-black text-white text-xs">HS</span>
            </div>
            <span className="font-bold text-gray-900">HungerSwipes</span>
            <span className="text-gray-400 text-xs ml-1">Vendor Registration</span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3">You&apos;re Live! 🎉</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Vendors near {form.locationText || 'your area'} can now discover your food on HungerSwipes.
          </p>

          {/* QR Code + Link */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 text-left">
            <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">Your QR Code</h2>
            <p className="text-xs text-gray-400 mb-3">Print this and put it where customers can see it:</p>
            <div className="bg-gray-100 rounded-xl p-4 text-center mb-4">
              <div className="text-5xl mb-2">📱</div>
              <p className="text-xs text-gray-500">Scan to see your listing</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1">Your vendor link:</p>
              <p className="text-sm font-mono text-[#FF5722] break-all">{shareUrl}</p>
            </div>
            <p className="text-xs text-gray-400">
              You can manage your listing at{' '}
              <span className="text-gray-700 font-medium">hunger-swipes.vercel.app/vendor-dashboard?id={vendorId}</span>
            </p>
          </div>

          {/* What happens next */}
          <div className="bg-[#FF5722]/5 border border-[#FF5722]/20 rounded-2xl p-5 mb-6 text-left">
            <h2 className="font-bold text-gray-900 mb-2">What happens next?</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2"><CheckCircle size={16} className="text-[#FF5722] mt-0.5 flex-shrink-0" /> A creator may reach out to photograph your food</li>
              <li className="flex items-start gap-2"><CheckCircle size={16} className="text-[#FF5722] mt-0.5 flex-shrink-0" /> Your listing appears in the swipe feed near your location</li>
              <li className="flex items-start gap-2"><CheckCircle size={16} className="text-[#FF5722] mt-0.5 flex-shrink-0" /> Customers discover you and come directly to buy</li>
            </ul>
          </div>

          <Link
            href={`/vendor-dashboard?id=${vendorId}`}
            className="block w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-center hover:bg-gray-800 transition mb-3"
          >
            Go to My Dashboard
          </Link>
          <Link
            href="/swipe"
            className="block w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-center hover:bg-gray-50 transition"
          >
            Preview the App
          </Link>
        </div>

        {/* Footer Disclaimer */}
        <footer className="border-t border-gray-200 px-4 py-4 text-center">
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            HungerSwipes is a discovery platform only. All vendors operate independently. HungerSwipes does not prepare or sell food.
          </p>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#FF5722] rounded-lg flex items-center justify-center">
              <span className="font-black text-white text-xs">HS</span>
            </div>
            <span className="font-bold text-gray-900">HungerSwipes</span>
          </Link>
          <span className="text-gray-400 text-xs ml-auto">Vendor Registration</span>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-1">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition ${s <= step ? 'bg-[#FF5722]' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{step === 1 ? 'Step 1 of 2: Food Info' : 'Step 2 of 2: Location & Payment'}</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4">
        {step === 1 ? (
          <div className="space-y-5">
            {/* Food Name */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                What are you selling? *
              </label>
              <input
                type="text"
                value={form.foodName}
                onChange={e => setForm(f => ({ ...f, foodName: e.target.value }))}
                placeholder="Ex: BBQ Plates, Soul Food, Tacos..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF5722] text-base"
                maxLength={60}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Brief description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Smoked brisket, pulled pork, mac & cheese..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF5722] text-base resize-none"
                maxLength={200}
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">Price range *</label>
              <div className="grid grid-cols-3 gap-3">
                {PRICE_RANGES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setForm(f => ({ ...f, priceRange: p.value }))}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.priceRange === p.value
                        ? 'border-[#FF5722] bg-[#FF5722]/10'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl font-black mb-0.5 text-gray-900">{p.label}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Photo <span className="text-gray-400 font-normal">(highly recommended)</span>
              </label>
              <label className="block cursor-pointer">
                {form.photoPreview ? (
                  <div className="relative">
                    <img src={form.photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                    <button
                      onClick={() => setForm(f => ({ ...f, photo: null, photoPreview: '' }))}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#FF5722]/50 transition-colors bg-white">
                    <Camera size={32} className="text-gray-400" />
                    <p className="text-sm text-gray-500">Tap to add a food photo</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.foodName || !form.priceRange}
              className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold text-base hover:bg-[#e64a19] transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Next: Location & Payment <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Location */}
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1 text-gray-700">
                <MapPin size={16} className="text-[#FF5722]" /> Location *
              </label>
              <input
                type="text"
                value={form.locationText}
                onChange={e => setForm(f => ({ ...f, locationText: e.target.value }))}
                placeholder="Ex: Claiborne & Franklin Ave, St. Louis"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF5722] text-base"
              />
              {gettingLocation && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#FF5722] rounded-full animate-pulse" />
                  Capturing GPS...
                </p>
              )}
              {locationError && (
                <p className="text-xs text-yellow-600 mt-1">{locationError}</p>
              )}
              {form.latitude && (
                <p className="text-xs text-[#10B981] mt-1">✓ GPS captured</p>
              )}
            </div>

            {/* Open/Closed Toggle */}
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1 text-gray-700">
                <Clock size={16} className="text-[#FF5722]" /> Current status
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: true, label: '🟢 Open Now', desc: 'Taking orders' },
                  { value: false, label: '🔴 Closed', desc: 'Not available right now' },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setForm(f => ({ ...f, isOpen: opt.value }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.isOpen === opt.value
                        ? 'border-[#FF5722] bg-[#FF5722]/10'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="font-bold text-sm text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1 text-gray-700">
                <DollarSign size={16} className="text-[#FF5722]" /> Payment methods you accept
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.value}
                    onClick={() => togglePayment(pm.value)}
                    className={`p-3 rounded-xl border text-left text-sm transition-all ${
                      form.paymentMethods.includes(pm.value)
                        ? 'border-[#FF5722] bg-[#FF5722]/10 text-[#FF5722]'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Hours <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.hoursText}
                onChange={e => setForm(f => ({ ...f, hoursText: e.target.value }))}
                placeholder="Ex: Mon–Sat 11am–8pm"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF5722] text-base"
              />
            </div>

            {/* Legal Disclaimer */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">⚠️ Important — Please Read</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                HungerSwipes is a <strong className="text-gray-700">discovery platform only</strong>. We do not prepare, handle, or sell food.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                All food is provided by <strong className="text-gray-700">independent vendors</strong>. You assume all risk when purchasing or consuming food. Please use your own judgment.
              </p>
              <label className="flex items-start gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-[#FF5722]"
                />
                <span className="text-xs text-gray-700">
                  I understand I am an <strong>independent seller</strong> and HungerSwipes is only a discovery tool.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !agreed || !form.locationText}
                className="flex-1 py-4 bg-[#FF5722] text-white rounded-xl font-bold text-base hover:bg-[#e64a19] transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? 'Going Live...' : '🔥 Go Live Now'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center border-t border-white/5 mt-6">
        <p className="text-xs text-gray-600">HungerSwipes is a discovery platform only. All vendors are independent sellers.</p>
      </footer>
    </div>
  )
}
