'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChefHat, X, AlertCircle } from 'lucide-react'
import { getAuthToken } from '@/lib/auth-fetch'
import RecipePaymentForm from '@/app/components/RecipePaymentForm'

export type RecipeSummary = {
  id: string
  dish_id: string
  title: string
  description?: string
  price: number
  photo_url?: string
  recipe_type?: 'free' | 'fixed_price' | 'proud_to_pay'
  min_proud_to_pay_amount?: number
}

export type RecipeDetail = RecipeSummary & {
  ingredients: string[]
  instructions: string[]
}

interface RecipeUnlockSheetProps {
  recipeId: string
  dishId: string
  sellerId?: string
  onClose: () => void
}

type ViewState =
  | { status: 'loading' }
  | { status: 'preview'; recipe: RecipeSummary }
  | { status: 'unlocked'; recipe: RecipeDetail }
  | { status: 'purchase'; recipe: RecipeSummary }
  | { status: 'checkout'; recipe: RecipeSummary; clientSecret: string }
  | { status: 'paying'; recipe: RecipeSummary }
  | { status: 'error'; message: string }

const PROUD_AMOUNTS = [5, 7, 10]

async function api(path: string, init?: RequestInit) {
  const token = await getAuthToken()
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

async function recordImpact(eventType: 'recipe_view' | 'recipe_purchase_intent', recipeId: string, dishId: string, sellerId?: string) {
  try {
    await api('/api/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, recipe_id: recipeId, dish_id: dishId, seller_id: sellerId }),
    })
  } catch {
    // best-effort
  }
}

export default function RecipeUnlockSheet({ recipeId, dishId, sellerId, onClose }: RecipeUnlockSheetProps) {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [proudAmount, setProudAmount] = useState<number | 'other' | null>(null)
  const [customAmount, setCustomAmount] = useState('')

  useEffect(() => {
    recordImpact('recipe_view', recipeId, dishId, sellerId)
  }, [recipeId, dishId, sellerId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await api(`/api/recipes/${recipeId}?mode=preview`)
        if (!mounted) return
        const recipe = data.recipe as RecipeSummary
        if (recipe.recipe_type === 'free') {
          // Free recipe: immediately unlock
          const unlockData = await api(`/api/recipes/${recipeId}?mode=unlock`)
          if (!mounted) return
          setState({ status: 'unlocked', recipe: unlockData.recipe as RecipeDetail })
        } else {
          setState({ status: 'preview', recipe })
        }
      } catch (err: any) {
        if (!mounted) return
        if (err.message?.includes('Authentication required')) {
          setState({ status: 'error', message: 'Sign in to view recipes.' })
        } else {
          setState({ status: 'error', message: err.message || 'Could not load recipe.' })
        }
      }
    })()
    return () => { mounted = false }
  }, [recipeId])

  const startPurchase = (recipe: RecipeSummary) => {
    setState({ status: 'purchase', recipe })
  }

  const confirmPurchase = async () => {
    if (state.status !== 'purchase') return
    const recipe = state.recipe
    const isProud = recipe.recipe_type === 'proud_to_pay'
    let amountUsd = recipe.price
    if (isProud) {
      if (proudAmount === 'other') {
        amountUsd = Math.max(parseFloat(customAmount) || 0, recipe.min_proud_to_pay_amount || 5)
      } else if (typeof proudAmount === 'number') {
        amountUsd = proudAmount
      } else {
        setState({ status: 'error', message: 'Choose an amount.' })
        return
      }
    }
    setState({ status: 'paying', recipe })
    try {
      await recordImpact('recipe_purchase_intent', recipe.id, dishId, sellerId)
      const data = await api('/api/recipes/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id, proud_to_pay_amount: isProud ? amountUsd : undefined }),
      })
      const clientSecret = data.client_secret as string | undefined
      if (!clientSecret) {
        setState({ status: 'error', message: 'Payment could not be started.' })
        return
      }
      setState({ status: 'checkout', recipe, clientSecret })
    } catch (err: any) {
      setState({ status: 'error', message: err.message || 'Payment failed.' })
    }
  }

  const finishPurchase = async (recipe: RecipeSummary) => {
    setState({ status: 'paying', recipe })
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const unlockData = await api(`/api/recipes/${recipe.id}?mode=unlock`)
        setState({ status: 'unlocked', recipe: unlockData.recipe as RecipeDetail })
        return
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 750))
      }
    }
    setState({ status: 'error', message: 'Payment succeeded, but the recipe is still processing. Reopen it in a moment.' })
  }

  const Header = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between mb-4">
      <button onClick={onClose} className="w-10 h-10 rounded-full bg-hs-soft flex items-center justify-center text-hs-cream hover:bg-hs-graphite transition">
        <X size={20} />
      </button>
      <h2 className="text-lg font-bold text-hs-cream truncate px-2">{title}</h2>
      <div className="w-10" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-hs-charcoal rounded-t-[2rem] border-t border-white/[0.06] p-5 pb-8 safe-bottom max-h-[85vh] overflow-y-auto">
        {state.status === 'loading' && (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-2 border-hs-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-hs-gray text-sm">Loading recipe…</p>
          </div>
        )}

        {state.status === 'error' && (
          <>
            <Header title="Recipe" />
            <div className="rounded-2xl bg-hs-red/10 border border-hs-red/30 p-4 flex gap-3">
              <AlertCircle size={20} className="text-hs-red shrink-0" />
              <div>
                <p className="text-sm text-hs-cream">{state.message}</p>
                {state.message.includes('Sign in') && (
                  <Link href="/auth?next=/swipe" className="inline-block mt-3 text-sm font-bold text-hs-gold">
                    Sign in →
                  </Link>
                )}
              </div>
            </div>
          </>
        )}

        {state.status === 'preview' && (
          <>
            <Header title={state.recipe.title} />
            {state.recipe.photo_url && (
              <img src={state.recipe.photo_url} alt="" className="w-full h-48 object-cover rounded-2xl mb-4 bg-hs-soft" />
            )}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-hs-gold text-hs-black text-xs font-bold">
                {state.recipe.recipe_type === 'fixed_price' ? `$${Number(state.recipe.price).toFixed(2)}` : state.recipe.recipe_type === 'proud_to_pay' ? `From $${Number(state.recipe.min_proud_to_pay_amount || state.recipe.price).toFixed(2)}` : 'Free'}
              </span>
              <span className="text-xs text-hs-gray">Unlock to see ingredients & instructions</span>
            </div>
            {state.recipe.description && (
              <p className="text-sm text-hs-gray mb-6">{state.recipe.description}</p>
            )}
            <button
              onClick={() => startPurchase(state.recipe)}
              className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-sm hover:bg-hs-gold-light transition"
            >
              Unlock Recipe
            </button>
          </>
        )}

        {state.status === 'purchase' && (
          <>
            <Header title="Unlock Recipe" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-hs-gold/10 flex items-center justify-center text-hs-gold">
                <ChefHat size={24} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-hs-cream truncate">{state.recipe.title}</p>
                <p className="text-xs text-hs-gray">
                  {state.recipe.recipe_type === 'proud_to_pay'
                    ? `Proud to Pay · min $${Number(state.recipe.min_proud_to_pay_amount || state.recipe.price).toFixed(2)}`
                    : `$${Number(state.recipe.price).toFixed(2)}`}
                </p>
              </div>
            </div>

            {state.recipe.recipe_type === 'proud_to_pay' ? (
              <div className="mb-5">
                <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Choose your amount</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PROUD_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setProudAmount(amt); setCustomAmount('') }}
                      className={`py-3 rounded-xl text-sm font-bold border transition ${
                        proudAmount === amt
                          ? 'bg-hs-gold text-hs-black border-hs-gold'
                          : 'bg-hs-soft text-hs-cream border-transparent hover:border-hs-gold/30'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Or enter your own</label>
                <div className="flex items-center gap-2">
                  <span className="text-hs-cream text-lg">$</span>
                  <input
                    type="number"
                    min={state.recipe.min_proud_to_pay_amount || 5}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setProudAmount('other') }}
                    placeholder={`${state.recipe.min_proud_to_pay_amount || 5}`}
                    className="flex-1 px-4 py-3 bg-hs-charcoal border border-white/[0.08] rounded-2xl text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-5 rounded-2xl bg-hs-soft p-4 text-center">
                <p className="text-xs text-hs-gray mb-1">Amount</p>
                <p className="text-2xl font-black text-hs-cream">${Number(state.recipe.price).toFixed(2)}</p>
              </div>
            )}

            <button
              onClick={confirmPurchase}
              className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-sm hover:bg-hs-gold-light transition"
            >
              Pay & Unlock
            </button>
            <p className="text-[10px] text-hs-gray text-center mt-3">
              Secure test payment powered by Stripe. No live payments are enabled.
            </p>
          </>
        )}

        {state.status === 'checkout' && (
          <>
            <Header title="Secure payment" />
            <RecipePaymentForm
              clientSecret={state.clientSecret}
              recipeId={state.recipe.id}
              onPaid={() => finishPurchase(state.recipe)}
              onError={(message) => setState({ status: 'error', message })}
            />
          </>
        )}

        {state.status === 'paying' && (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-2 border-hs-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-hs-gray text-sm">Confirming payment…</p>
          </div>
        )}

        {state.status === 'unlocked' && (
          <>
            <Header title={state.recipe.title} />
            {state.recipe.photo_url && (
              <img src={state.recipe.photo_url} alt="" className="w-full h-40 object-cover rounded-2xl mb-4 bg-hs-soft" />
            )}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {state.recipe.ingredients.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-hs-cream">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-hs-gold shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3">Instructions</h3>
              <ol className="space-y-4">
                {state.recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-hs-cream">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-hs-gold text-hs-black text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
