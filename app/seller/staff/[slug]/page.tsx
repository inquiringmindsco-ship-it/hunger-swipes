'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Camera, ImagePlus, Plus, ArrowRight } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'

interface Seller {
  id: string
  slug: string
  business_name: string
  logo_url: string | null
  status: string
}

export default function StaffUploadPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [error, setError] = useState('')

  // PIN state
  const [pin, setPin] = useState('')
  const [pinSubmitting, setPinSubmitting] = useState(false)

  // Upload state
  const [form, setForm] = useState({ name: '', price: '', description: '', photo_url: '' })
  const [preview, setPreview] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const currency = useMemo(() => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      Number.isFinite(Number(form.price)) ? Number(form.price) : 0,
    )
  }, [form.price])

  useEffect(() => {
    if (!slug) return
    fetch('/api/staff/dishes', { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setSeller(data.seller)
        }
        // Otherwise show PIN form.
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        window.location.reload()
        return
      }
      setError(data.error || 'Invalid PIN')
    } catch {
      setError('Network error')
    } finally {
      setPinSubmitting(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setError('')
    try {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)

      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/staff/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (data.url) {
        setForm((f) => ({ ...f, photo_url: data.url }))
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const priceNum = Number.parseFloat(form.price || '')
    if (!form.name.trim()) {
      setError('Dish name is required')
      setSubmitting(false)
      return
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('Enter a valid price greater than $0')
      setSubmitting(false)
      return
    }
    if (!form.photo_url) {
      setError('Take or choose a photo first')
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch('/api/staff/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: priceNum,
          photo_url: form.photo_url,
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error || 'Failed to save dish')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', price: '', description: '', photo_url: '' })
    setPreview('')
    setDone(false)
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hs-ink text-hs-cream flex items-center justify-center">
        <div className="text-center">
          <BrandMark size={40} className="mx-auto mb-4" />
          <p className="text-sm text-hs-gray">Loading…</p>
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Staff Upload</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8">
          <h1 className="text-2xl font-black text-hs-cream mb-2">Staff access</h1>
          <p className="text-sm text-hs-gray mb-6">Enter the restaurant PIN to add dishes for {slug}.</p>
          {error && (
            <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4 mb-5">
              <p className="text-sm text-hs-red font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Restaurant PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition text-center text-2xl tracking-[0.3em]"
              />
            </label>
            <button
              type="submit"
              disabled={pinSubmitting || !pin}
              className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold disabled:opacity-50"
            >
              {pinSubmitting ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        </main>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">{seller.business_name}</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={44} className="text-hs-gold" />
          </div>
          <h1 className="text-2xl font-black text-hs-cream mb-2">Dish submitted</h1>
          <p className="text-hs-gray text-sm mb-6">
            It will appear after the owner activates it.
          </p>
          <button
            onClick={resetForm}
            className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold inline-flex items-center justify-center gap-2 mb-3"
          >
            <Plus size={18} /> Add Another Dish
          </button>
          <p className="text-xs text-hs-muted">Staff session active for {seller.business_name}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">Add Dish</span>
          <span className="ml-auto text-xs text-hs-gray truncate max-w-[120px]">{seller.business_name}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        <section>
          <label className="block">
            <span className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Photo *</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-white/15 rounded-2xl p-4 text-center hover:border-hs-gold/40 transition bg-hs-charcoal h-full flex flex-col items-center justify-center gap-2">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl mx-auto" />
                  ) : (
                    <>
                      <Camera size={24} className="text-hs-gray mx-auto" />
                      <span className="text-xs text-hs-gray">Take photo</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                />
              </label>
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-white/15 rounded-2xl p-4 text-center hover:border-hs-gold/40 transition bg-hs-charcoal h-full flex flex-col items-center justify-center gap-2">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl mx-auto" />
                  ) : (
                    <>
                      <ImagePlus size={24} className="text-hs-gray mx-auto" />
                      <span className="text-xs text-hs-gray">Choose photo</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            {uploadingPhoto && <p className="text-xs text-hs-gold mt-2 text-center">Uploading photo…</p>}
            {form.photo_url && <p className="text-xs text-hs-success mt-2 text-center">Photo ready</p>}
          </label>
        </section>

        <section>
          <label htmlFor="name" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Dish Name *</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Smoked Brisket Plate"
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
          />
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Price ($) *</label>
            <input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-hs-cream font-medium pb-4">{currency}</p>
          </div>
        </section>

        <section>
          <label htmlFor="description" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Description <span className="text-hs-gray font-normal normal-case">(optional)</span></label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What's in it?"
            rows={2}
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition resize-none"
          />
        </section>

        <button
          onClick={handleSubmit}
          disabled={submitting || uploadingPhoto || !form.photo_url || !form.name || !form.price}
          className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {submitting ? 'Saving…' : (
            <>Submit Dish <ArrowRight size={18} /></>
          )}
        </button>
      </main>
    </div>
  )
}
