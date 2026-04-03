'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, DollarSign, Camera, Edit2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'

function VendorDashboardContent() {
  const params = useSearchParams()
  const vendorId = params.get('id')

  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    foodName: '',
    description: '',
    priceRange: '',
    locationText: '',
    isOpen: true,
    hoursText: '',
    paymentMethods: [] as string[],
  })

  const PAYMENT_METHODS = ['cash', 'cashapp', 'venmo', 'zelle']

  useEffect(() => {
    if (!vendorId) {
      setLoading(false)
      return
    }
    fetch(`/api/vendors/register?id=${vendorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.vendor) {
          setVendor(d.vendor)
          setForm({
            foodName: d.vendor.food_name || '',
            description: d.vendor.description || '',
            priceRange: d.vendor.price_range || '',
            locationText: d.vendor.location_text || '',
            isOpen: d.vendor.is_open !== false,
            hoursText: d.vendor.hours_text || '',
            paymentMethods: d.vendor.payment_methods || [],
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [vendorId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/vendors/register?id=${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setEditMode(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  const togglePayment = (method: string) => {
    setForm(f => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method)
        ? f.paymentMethods.filter(m => m !== method)
        : [...f.paymentMethods, method],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-3">No Vendor ID</h1>
          <p className="text-gray-400 mb-6">Scan the QR code on your listing to access your dashboard.</p>
          <Link href="/vendor-intake" className="text-[#FF5722] font-semibold">Register a new vendor →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Header */}
      <header className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FF5722] rounded-lg flex items-center justify-center font-black text-white text-xs">HS</div>
          <span className="font-bold text-sm">Vendor Dashboard</span>
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-[#10B981]">✓ Saved</span>}
          <Link href={`/swipe?vendor=${vendorId}`} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <ExternalLink size={14} /> Preview
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status Banner */}
        <div className={`rounded-2xl p-4 flex items-center justify-between ${
          form.isOpen ? 'bg-[#10B981]/10 border border-[#10B981]/20' : 'bg-white/5 border border-white/10'
        }`}>
          <div>
            <p className="text-sm font-semibold">{form.isOpen ? '🟢 Open for Business' : '🔴 Closed'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.isOpen ? 'Appearing in swipe feeds near you' : 'Hidden from swipe feeds'}
            </p>
          </div>
          <button
            onClick={() => { setForm(f => ({ ...f, isOpen: !f.isOpen })); setEditMode(true) }}
            className="text-3xl"
          >
            {form.isOpen ? <ToggleRight size={40} className="text-[#10B981]" /> : <ToggleLeft size={40} className="text-gray-500" />}
          </button>
        </div>

        {/* Edit Form */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Your Listing</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-sm text-[#FF5722] font-semibold flex items-center gap-1"
            >
              <Edit2 size={14} /> {editMode ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Food Name</label>
                <input
                  value={form.foodName}
                  onChange={e => setForm(f => ({ ...f, foodName: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF5722] resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Price Range</label>
                <div className="grid grid-cols-3 gap-2">
                  {['$', '$$', '$$$'].map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, priceRange: p }))}
                      className={`py-2 rounded-lg border text-center text-sm font-bold transition ${
                        form.priceRange === p ? 'border-[#FF5722] bg-[#FF5722]/10' : 'border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Location</label>
                <input
                  value={form.locationText}
                  onChange={e => setForm(f => ({ ...f, locationText: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hours</label>
                <input
                  value={form.hoursText}
                  onChange={e => setForm(f => ({ ...f, hoursText: e.target.value }))}
                  placeholder="Ex: Mon–Sat 11am–8pm"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Payment</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm}
                      onClick={() => togglePayment(pm)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition ${
                        form.paymentMethods.includes(pm)
                          ? 'border-[#FF5722] bg-[#FF5722]/10 text-white'
                          : 'border-white/10 text-gray-400'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold text-sm hover:bg-[#e64a19] transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-xl">{form.foodName || 'Unnamed'}</h3>
                  {form.description && <p className="text-sm text-gray-400 mt-1">{form.description}</p>}
                </div>
                <span className="text-2xl font-black text-[#FF5722]">{form.priceRange}</span>
              </div>
              {form.locationText && (
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <MapPin size={14} className="text-[#FF5722]" /> {form.locationText}
                </div>
              )}
              {form.hoursText && (
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Clock size={14} className="text-[#FF5722]" /> {form.hoursText}
                </div>
              )}
              {form.paymentMethods.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <DollarSign size={14} className="text-[#FF5722]" /> {form.paymentMethods.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <h2 className="font-bold mb-3">Your Performance</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Swipes', value: '0', sub: 'Today' },
              { label: 'Views', value: '0', sub: 'This week' },
              { label: 'Orders', value: '0', sub: 'Total' },
            ].map(stat => (
              <div key={stat.label} className="p-3 bg-white/[0.02] rounded-xl">
                <div className="text-xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
                <div className="text-xs text-gray-600">{stat.sub}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 text-center mt-3">
            Performance stats activate when your listing goes live
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
          <h2 className="font-bold mb-3">Your QR Code</h2>
          <p className="text-sm text-gray-400 mb-4">Print this and put it where customers can see it</p>
          <div className="bg-white p-4 rounded-xl inline-block">
            <p className="text-xs text-gray-500 font-mono">hungerswipes.vercel.app/vendor-intake?id={vendorId?.slice(0, 8)}</p>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Share your link: <span className="text-white">hungerswipes.vercel.app/vendor-intake?id={vendorId}</span>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-white">Loading...</div>}>
      <VendorDashboardContent />
    </Suspense>
  )
}
