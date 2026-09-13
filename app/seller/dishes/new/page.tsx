'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { BrandMark } from '@/app/components/icons/HungerIcons'

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
    return <div className="min-h-screen flex items-center justify-center">Checking your account...</div>
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
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
          <h1 className="text-2xl font-black mb-2">Dish saved!</h1>
          <p className="text-gray-600 mb-6">
            {sellerStatus === 'active' ? 'It is now live on the swipe feed.' : 'It will appear after your seller profile is approved.'}
          </p>
          <Link
            href="/seller/dashboard"
            className="block w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold text-center mb-3"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/swipe"
            className="block w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-center"
          >
            Preview in App
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Link href="/seller/dashboard" aria-label="Back to seller dashboard" className="inline-flex min-h-11 min-w-11 items-center justify-center text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span className="font-bold text-gray-900">Add Your First Dish</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2">Dish name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Smoked Brisket Plate"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What makes it special?"
            rows={2}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722] resize-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-2">Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Tags (comma separated)</label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="gluten-free, spicy, comfort food"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Photo</label>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#FF5722] transition">
              {preview || form.photo_url ? (
                <img src={preview || form.photo_url} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto" />
              ) : (
                <div className="text-gray-400 flex flex-col items-center gap-2">
                  <ImagePlus size={24} aria-hidden="true" />
                  <span className="text-sm">Tap to upload dish photo</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Or paste image URL</label>
          <input
            value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#FF5722]"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/seller/dashboard"
            className="min-h-12 px-5 py-3 bg-white border border-gray-200 rounded-xl font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft size={18} aria-hidden="true" /> Back
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 min-h-12 py-3 bg-[#FF5722] text-white rounded-xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {submitting ? 'Publishing...' : <>Publish Dish <ArrowRight size={18} aria-hidden="true" /></>}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function NewDishPage() {
  return <NewDishContent />
}
