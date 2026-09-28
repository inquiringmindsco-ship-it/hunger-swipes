'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { LoadingState } from '@/app/components/ui/LoadingState'
import MobileNav from '@/app/components/MobileNav'

const CATEGORIES = [
  'American', 'BBQ', 'Breakfast', 'Cajun', 'Chinese', 'Dessert', 'Healthy', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mexican', 'Middle Eastern', 'Pizza', 'Seafood', 'Soul Food', 'Thai', 'Vegan', 'Other'
]

function NewDishContent() {
  const router = useRouter()
  const [sellerId, setSellerId] = useState('')
  const [sellerStatus, setSellerStatus] = useState('')
  const [authChecking, setAuthChecking] = useState(true)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'American',
    tags: '',
    availability: 'available',
    photo_url: '',
    status: 'active',
  })
  const [preview, setPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSeller = async () => {
      try {
        const response = await authFetch('/api/sellers?mine=true')
        if (response.status === 401) {
          router.replace('/auth?next=%2Fseller%2Fdishes%2Fnew')
          return
        }
        const data = await response.json()
        if (!data.seller) {
          router.replace('/join')
          return
        }
        setSellerId(data.seller.id)
        setSellerStatus(data.seller.status)
      } catch {
        setError('Unable to load your seller profile.')
      } finally {
        setAuthChecking(false)
      }
    }
    loadSeller()
  }, [router])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'dish-photos')
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setForm((f) => ({ ...f, photo_url: data.url }))
    } catch {}
  }

  const handleSubmit = async () => {
    if (!sellerId) {
      setError('Missing seller ID. Please return to dashboard.')
      return
    }
    if (!form.name || !form.photo_url) {
      setError('Dish name and an uploaded dish photo are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await authFetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          name: form.name,
          description: form.description,
          price: parseFloat(form.price || '0'),
          category: form.category,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          availability: form.availability,
          photo_url: form.photo_url,
          status: form.status,
        }),
      })
      const data = await res.json()
      if (data.dish) {
        setDone(true)
      } else {
        setError(data.error || 'Failed to create dish')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Add Dish</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your seller profile…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Dish Saved</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={44} className="text-hs-gold" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black text-hs-cream mb-2">Dish saved!</h1>
          <p className="text-hs-gray text-sm mb-8">
            {sellerStatus === 'active' ? 'It is now live on the swipe feed.' : 'It will appear after your seller profile is approved.'}
          </p>
          <Link
            href="/seller/dashboard"
            className="block w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-center hover:bg-hs-gold-light transition mb-3"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/swipe"
            className="block w-full py-3 border border-white/[0.08] text-hs-cream rounded-2xl font-semibold text-center hover:bg-hs-charcoal transition"
          >
            Preview in App
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
          <Link href="/seller/dashboard" aria-label="Back to seller dashboard" className="w-10 h-10 rounded-full flex items-center justify-center text-hs-gray hover:bg-hs-soft hover:text-hs-cream transition">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span className="font-bold text-base text-hs-cream tracking-tight">Add a Dish</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        <section>
          <label htmlFor="name" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Dish Name *</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Smoked Brisket Plate"
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
          />
        </section>

        <section>
          <label htmlFor="description" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Description <span className="text-hs-gray font-normal normal-case">(optional)</span></label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What makes it special?"
            rows={2}
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition resize-none"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Price ($)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </div>
          <div>
            <label htmlFor="category" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Category</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream focus:border-hs-gold/50 focus:outline-none transition appearance-none"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </section>

        <section>
          <label htmlFor="tags" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Tags <span className="text-hs-gray font-normal normal-case">(comma separated)</span></label>
          <input
            id="tags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="gluten-free, spicy, comfort food"
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
          />
        </section>

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Photo *</label>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-hs-gold/40 transition bg-hs-charcoal">
              {preview || form.photo_url ? (
                <img src={preview || form.photo_url} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto" />
              ) : (
                <div className="text-hs-gray flex flex-col items-center gap-2">
                  <ImagePlus size={24} aria-hidden="true" />
                  <span className="text-sm font-medium">Tap to upload dish photo</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </section>

        <section>
          <label htmlFor="photo-url" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Or Paste Image URL</label>
          <input
            id="photo-url"
            value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
          />
        </section>

        <section className="flex gap-3 pt-4">
          <Link
            href="/seller/dashboard"
            className="min-h-12 px-5 py-3 border border-white/[0.08] bg-hs-charcoal text-hs-cream rounded-2xl font-semibold inline-flex items-center gap-2 hover:bg-hs-soft transition"
          >
            <ArrowLeft size={18} aria-hidden="true" /> Back
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 min-h-12 py-3 bg-hs-gold text-hs-black rounded-2xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-hs-gold-light transition"
          >
            {submitting ? 'Publishing...' : <>Publish Dish <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </section>
      </main>
      <MobileNav />
    </div>
  )
}

export default function NewDishPage() {
  return <NewDishContent />
}
