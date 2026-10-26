'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, Plus, Trash2, Video } from 'lucide-react'
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
  const [sellerType, setSellerType] = useState('')
  const [authChecking, setAuthChecking] = useState(true)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'American',
    tags: '',
    availability: 'available',
    photo_url: '',
  })
  const [preview, setPreview] = useState('')
  const [ingredients, setIngredients] = useState([{ quantity: '', unit: '', name: '' }])
  const [allergens, setAllergens] = useState<string[]>([])
  const [servingSize, setServingSize] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [createdDishId, setCreatedDishId] = useState('')
  const [addRecipeNext, setAddRecipeNext] = useState(false)
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
        setSellerType(data.seller.seller_type || '')
        if (data.seller.seller_type === 'recipe_creator' || new URLSearchParams(window.location.search).get('continue') === 'recipe') {
          setAddRecipeNext(true)
        }
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
          ingredients: ingredients.filter((item) => item.name.trim()),
          allergens,
          serving_size: servingSize,
          availability: form.availability,
          photo_url: form.photo_url,
        }),
      })
      const data = await res.json()
      if (data.dish) {
        setCreatedDishId(data.dish.id)
        if (sellerType === 'recipe_creator' || addRecipeNext) {
          router.replace(`/seller/recipes/new?dish=${encodeURIComponent(data.dish.id)}`)
        } else {
          setDone(true)
        }
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
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
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
    const isRecipeCreator = sellerType === 'recipe_creator'
    return (
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
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
          <h1 className="text-2xl font-black text-hs-cream mb-2">{isRecipeCreator ? 'Food saved!' : 'Dish saved!'}</h1>
          <p className="text-hs-gray text-sm mb-8">
            {isRecipeCreator
              ? 'Now add the ingredients and instructions. The complete recipe will appear after review.'
              : 'It is awaiting approval and will appear in Discover after an admin reviews it.'}
          </p>
          {isRecipeCreator ? (
            <Link
              href={`/seller/recipes/new?dish=${encodeURIComponent(createdDishId)}`}
              className="block w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-center hover:bg-hs-gold-light transition mb-3"
            >
              Continue to Ingredients &amp; Instructions
            </Link>
          ) : (
            <Link
              href="/seller/dashboard"
              className="block w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-center hover:bg-hs-gold-light transition mb-3"
            >
              Back to Dashboard
            </Link>
          )}
          <Link
            href="/swipe"
            className="block w-full py-3 border border-white/[0.08] text-hs-cream rounded-2xl font-semibold text-center hover:bg-hs-charcoal transition"
          >
            Browse Discover
          </Link>
        </main>
        <MobileNav />
      </div>
    )
  }

  const isHomeCook = sellerType === 'home_cook' || sellerType === 'home_kitchen'
  const isRecipeCreator = sellerType === 'recipe_creator'
  const allergenOptions = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame']

  return (
    <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <Link href="/seller/dashboard" aria-label="Back to seller dashboard" className="w-10 h-10 rounded-full flex items-center justify-center text-hs-gray hover:bg-hs-soft hover:text-hs-cream transition">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span className="font-bold text-base text-hs-cream tracking-tight">{isRecipeCreator ? 'Add Recipe Food' : 'Add a Dish'}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        <section>
          <label htmlFor="name" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">{isRecipeCreator ? 'Recipe / Dish Name' : 'Dish Name'} *</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={isRecipeCreator ? 'Ex: Grandma’s Smothered Chicken' : 'Ex: Smoked Brisket Plate'}
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
          />
        </section>

        <section className="rounded-3xl border border-hs-gold/20 bg-hs-gold/5 p-4">
          <button
            type="button"
            role="switch"
            aria-checked={sellerType === 'recipe_creator' || addRecipeNext}
            onClick={() => sellerType !== 'recipe_creator' && setAddRecipeNext((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <span>
              <span className="block font-black text-hs-cream">Add the recipe next</span>
              <span className="mt-1 block text-xs leading-relaxed text-hs-gray">
                Continue straight to ingredients and instructions after this photo uploads. You do not have to wait for dish approval.
              </span>
            </span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${sellerType === 'recipe_creator' || addRecipeNext ? 'bg-hs-gold' : 'bg-hs-soft'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${sellerType === 'recipe_creator' || addRecipeNext ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
          {sellerType === 'recipe_creator' && <p className="mt-3 text-[11px] font-semibold text-hs-gold">Recipe Creator accounts continue automatically.</p>}
        </section>

        {isHomeCook && <section className="rounded-3xl border border-hs-gold/20 bg-hs-gold/5 p-4">
          <div className="mb-4">
            <h2 className="font-black text-hs-cream">What’s in this dish?</h2>
            <p className="mt-1 text-xs leading-relaxed text-hs-gray">Add the ingredients customers should know about. Full recipe instructions stay private unless you publish a separate recipe.</p>
          </div>
          <div className="space-y-3">
            {ingredients.map((ingredient, index) => <div key={index} className="grid grid-cols-[0.7fr_0.9fr_1.8fr_auto] gap-2">
              <input aria-label={`Ingredient ${index + 1} quantity`} value={ingredient.quantity} onChange={(event) => setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} placeholder="2" className="min-w-0 rounded-xl border border-white/[0.08] bg-hs-charcoal px-3 py-3 text-sm text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none" />
              <input aria-label={`Ingredient ${index + 1} unit`} value={ingredient.unit} onChange={(event) => setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item))} placeholder="cups" className="min-w-0 rounded-xl border border-white/[0.08] bg-hs-charcoal px-3 py-3 text-sm text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none" />
              <input aria-label={`Ingredient ${index + 1} name`} value={ingredient.name} onChange={(event) => setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="flour" className="min-w-0 rounded-xl border border-white/[0.08] bg-hs-charcoal px-3 py-3 text-sm text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none" />
              <button type="button" aria-label={`Remove ingredient ${index + 1}`} disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 min-w-11 rounded-xl text-hs-gray disabled:opacity-30"><Trash2 size={17} className="mx-auto" /></button>
            </div>)}
          </div>
          <button type="button" onClick={() => setIngredients((current) => [...current, { quantity: '', unit: '', name: '' }])} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-hs-soft px-4 text-xs font-bold text-hs-gold"><Plus size={15} /> Add Ingredient</button>
          <label htmlFor="serving-size" className="mt-5 block text-xs font-semibold uppercase tracking-wider text-hs-gold">Serving Size</label>
          <input id="serving-size" value={servingSize} onChange={(event) => setServingSize(event.target.value)} placeholder="Example: Serves 2 or one 12 oz bowl" className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3 text-sm text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none" />
          <fieldset className="mt-5"><legend className="text-xs font-semibold uppercase tracking-wider text-hs-gold">Contains Allergens</legend><div className="mt-2 flex flex-wrap gap-2">{allergenOptions.map((allergen) => <button type="button" key={allergen} aria-pressed={allergens.includes(allergen)} onClick={() => setAllergens((current) => current.includes(allergen) ? current.filter((item) => item !== allergen) : [...current, allergen])} className={`min-h-10 rounded-full px-3 text-xs font-bold ${allergens.includes(allergen) ? 'bg-hs-gold text-hs-black' : 'border border-white/[0.08] bg-hs-soft text-hs-gray'}`}>{allergen}</button>)}</div></fieldset>
          <p className="mt-3 text-[11px] leading-relaxed text-hs-muted">Customers with allergies should always confirm ingredients directly with the seller.</p>
        </section>}

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

        <section>
          <div className="rounded-2xl border border-hs-gold/20 bg-hs-gold/10 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-hs-gold/15 text-hs-gold flex items-center justify-center shrink-0">
              <Video size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-hs-cream">Food videos — Coming Soon</p>
              <p className="mt-1 text-xs text-hs-gray">Launch with a great photo today. Short food videos will arrive in a future update.</p>
            </div>
          </div>
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
            {submitting ? 'Submitting...' : <>{sellerType === 'recipe_creator' || addRecipeNext ? 'Continue to Recipe' : 'Submit for Review'} <ArrowRight size={18} aria-hidden="true" /></>}
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
