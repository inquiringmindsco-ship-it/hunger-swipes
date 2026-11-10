'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2, Upload } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { BrandMark, SellerTypeIcon } from '@/app/components/icons/HungerIcons'
import { LoadingState } from '@/app/components/ui/LoadingState'
import MobileNav from '@/app/components/MobileNav'

interface Dish {
  id: string
  name: string
  photo_url: string | null
  price: number
  status?: string
  ingredients?: { quantity: string; unit: string; name: string }[]
}

export default function NewRecipePage() {
  const router = useRouter()
  const [seller, setSeller] = useState<any>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [dishId, setDishId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [ingredients, setIngredients] = useState<{ quantity: string; unit: string; name: string }[]>([])
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [instructions, setInstructions] = useState([''])

  useEffect(() => {
    const load = async () => {
      try {
        const sellerRes = await authFetch('/api/sellers?mine=true')
        if (sellerRes.status === 401) {
          router.replace('/auth?next=%2Fseller%2Frecipes%2Fnew')
          return
        }
        const sellerData = await sellerRes.json()
        if (!sellerData.seller) {
          router.replace('/join')
          return
        }
        setSeller(sellerData.seller)

        const dishesRes = await authFetch(`/api/sellers/${sellerData.seller.id}/dishes`)
        const dishesData = await dishesRes.json()
        const available = (dishesData.dishes || []).filter((d: any) => d.status !== 'removed')
        setDishes(available)
        const requestedDishId = new URLSearchParams(window.location.search).get('dish')
        const initialDish = available.find((dish: Dish) => dish.id === requestedDishId) || available[0]
        if (initialDish) {
          setDishId(initialDish.id)
          setTitle(initialDish.name)
          setPhotoUrl(initialDish.photo_url || '')
          const dishIngredients = Array.isArray(initialDish.ingredients) ? initialDish.ingredients.filter((item: { name?: string }) => item?.name?.trim()) : []
          setIngredients(dishIngredients)
          setIngredientsOpen(dishIngredients.length > 0)
        }
      } catch {
        setError('Unable to load your dishes.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const selectedDish = dishes.find((d) => d.id === dishId)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'dish-photos')
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setPhotoUrl(data.url)
    } catch {}
  }

  const handleSubmit = async () => {
    if (!dishId || !title.trim()) {
      setError('Choose a dish and give the recipe a title.')
      return
    }
    const cleanIngredients = ingredients
      .filter((ingredient) => ingredient.name.trim())
      .map((ingredient) => [ingredient.quantity.trim(), ingredient.unit.trim(), ingredient.name.trim()].filter(Boolean).join(' '))
    const cleanInstructions = instructions.map((s) => s.trim()).filter(Boolean)
    if (cleanIngredients.length === 0 || cleanInstructions.length === 0) {
      setError('Add at least one ingredient and one instruction.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body: any = {
        dish_id: dishId,
        title: title.trim(),
        description: description.trim() || null,
        price: 0,
        recipe_type: 'free',
        min_proud_to_pay_amount: null,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
        photo_url: photoUrl || selectedDish?.photo_url || null,
        published: true,
      }

      const res = await authFetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save recipe')
      router.replace('/seller/dashboard?tab=recipes')
    } catch (reason: any) {
      setError(reason.message || 'Could not save recipe')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">New Recipe</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your dishes…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (dishes.length === 0) {
    return (
      <div className="page-with-mobile-nav min-h-screen bg-hs-ink">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <Link href="/seller/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full text-hs-gray hover:bg-hs-soft hover:text-hs-cream transition">
              <ArrowLeft size={20} />
            </Link>
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">New Recipe</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-black text-hs-cream">Start with the food</h1>
          <p className="mt-2 text-hs-gray text-sm mb-5">Add a photo and name for the finished dish, then you’ll continue directly to its ingredients and instructions. You do not have to wait for approval.</p>
          <Link href="/seller/dishes/new?continue=recipe" className="inline-flex items-center gap-2 px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm">
            Add Food &amp; Recipe <ArrowRight size={16} />
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
          <Link href="/seller/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full text-hs-gray hover:bg-hs-soft hover:text-hs-cream transition">
            <ArrowLeft size={20} />
          </Link>
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">New Recipe</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Dish *</label>
          <select
            value={dishId}
            onChange={(e) => {
              setDishId(e.target.value)
              const d = dishes.find((x) => x.id === e.target.value)
              if (d) {
                setTitle((t) => (t.startsWith('Recipe:') ? `Recipe: ${d.name}` : t || d.name))
                setPhotoUrl((p) => p || d.photo_url || '')
                const dishIngredients = Array.isArray(d.ingredients) ? d.ingredients.filter((item: { name?: string }) => item?.name?.trim()) : []
                setIngredients(dishIngredients)
                setIngredientsOpen(dishIngredients.length > 0)
              }
            }}
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream focus:border-hs-gold/50 focus:outline-none transition appearance-none"
          >
            {dishes.map((d) => (
              <option key={d.id} value={d.id}>{d.name}{d.status === 'pending' ? ' · awaiting review' : ''}</option>
            ))}
          </select>
          <p className="text-xs text-hs-gray mt-2">Pending food is allowed here. The dish and recipe will appear after review.</p>
        </section>

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Recipe Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Smothered Chicken — The Recipe"
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
          />
        </section>

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">About this recipe</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this recipe worth it?"
            rows={3}
            className="w-full px-4 py-4 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition resize-none"
          />
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3">
          <p className="text-sm font-bold text-hs-cream">Recipe access</p>
          <span className="rounded-full bg-hs-gold/10 px-3 py-1 text-xs font-bold text-hs-gold">Free</span>
        </section>

        <section>
          <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Photo</label>
          <div className="flex items-center gap-3">
            {photoUrl && <img src={photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />}
            <label className="flex-1 py-4 border-2 border-dashed border-white/15 rounded-2xl text-center text-sm text-hs-gray cursor-pointer hover:border-hs-gold/40 hover:text-hs-cream transition">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <Upload size={18} className="mx-auto mb-1" />
              Upload recipe photo
            </label>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider">Ingredients</label>
            <button
              type="button"
              aria-expanded={ingredientsOpen}
              onClick={() => {
                setIngredientsOpen(true)
                setIngredients((current) => [...current, { quantity: '', unit: '', name: '' }])
              }}
              className="text-xs text-hs-gold font-semibold inline-flex items-center gap-1"
            >
              <Plus size={14} /> Add ingredient
            </button>
          </div>
          {ingredientsOpen && <div className="space-y-2">
            {ingredients.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[0.7fr_0.9fr_1.8fr_auto] gap-2">
                <input
                  aria-label={`Ingredient ${idx + 1} quantity`}
                  value={item.quantity}
                  onChange={(e) => setIngredients((current) => current.map((ingredient, ingredientIndex) => ingredientIndex === idx ? { ...ingredient, quantity: e.target.value } : ingredient))}
                  placeholder="Qty"
                  className="min-w-0 px-3 py-3 bg-hs-charcoal border border-white/[0.08] rounded-xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition text-sm"
                />
                <input
                  aria-label={`Ingredient ${idx + 1} unit`}
                  value={item.unit}
                  onChange={(e) => setIngredients((current) => current.map((ingredient, ingredientIndex) => ingredientIndex === idx ? { ...ingredient, unit: e.target.value } : ingredient))}
                  placeholder="Unit"
                  className="min-w-0 px-3 py-3 bg-hs-charcoal border border-white/[0.08] rounded-xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition text-sm"
                />
                <input
                  aria-label={`Ingredient ${idx + 1} name`}
                  value={item.name}
                  onChange={(e) => setIngredients((current) => current.map((ingredient, ingredientIndex) => ingredientIndex === idx ? { ...ingredient, name: e.target.value } : ingredient))}
                  placeholder="Ingredient"
                  className="min-w-0 px-3 py-3 bg-hs-charcoal border border-white/[0.08] rounded-xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  aria-label={`Remove ingredient ${idx + 1}`}
                  className="min-h-11 min-w-11 text-hs-gray hover:text-hs-red disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider">Instructions</label>
            <button
              type="button"
              onClick={() => setInstructions([...instructions, ''])}
              className="text-xs text-hs-gold font-semibold inline-flex items-center gap-1"
            >
              <Plus size={14} /> Add step
            </button>
          </div>
          <div className="space-y-2">
            {instructions.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="mt-3 text-xs text-hs-gold font-bold w-5">{idx + 1}.</span>
                <textarea
                  value={item}
                  onChange={(e) => {
                    const next = [...instructions]
                    next[idx] = e.target.value
                    setInstructions(next)
                  }}
                  placeholder={`Step ${idx + 1}`}
                  rows={2}
                  className="flex-1 px-4 py-3 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition text-sm resize-none"
                />
                <button
                  type="button"
                  onClick={() => setInstructions(instructions.filter((_, i) => i !== idx))}
                  className="px-3 text-hs-gray hover:text-hs-red"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3 pt-4">
          <Link
            href="/seller/dashboard"
            className="min-h-12 px-5 py-3 border border-white/[0.08] bg-hs-charcoal text-hs-cream rounded-2xl font-semibold inline-flex items-center gap-2 hover:bg-hs-soft transition"
          >
            <ArrowLeft size={18} /> Back
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 min-h-12 py-3 bg-hs-gold text-hs-black rounded-2xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-hs-gold-light transition"
          >
            {saving ? 'Submitting…' : <><CheckCircle2 size={18} /> Submit Recipe for Review</>}
          </button>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
