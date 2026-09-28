'use client'

import { FormEvent, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = publishableKey.startsWith('pk_test_') ? loadStripe(publishableKey) : null

function PaymentForm({ returnUrl, onPaid, onError }: {
  returnUrl: string
  onPaid: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements || submitting) return
    setSubmitting(true)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })
    setSubmitting(false)
    if (error) return onError(error.message || 'Payment failed.')
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') return onPaid()
    onError('Payment was not completed. Please try again.')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-sm hover:bg-hs-gold-light transition disabled:opacity-50"
      >
        {submitting ? 'Confirming…' : 'Pay & Unlock'}
      </button>
    </form>
  )
}

export default function RecipePaymentForm({ clientSecret, recipeId, onPaid, onError }: {
  clientSecret: string
  recipeId: string
  onPaid: () => void
  onError: (message: string) => void
}) {
  if (!stripePromise) {
    return <p className="text-sm text-hs-red">Stripe test payments are not configured.</p>
  }
  const origin = typeof window === 'undefined' ? 'https://hungerswipes.com' : window.location.origin
  const returnUrl = `${origin}/swipe?recipe_payment=complete&recipe_id=${encodeURIComponent(recipeId)}`
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm returnUrl={returnUrl} onPaid={onPaid} onError={onError} />
    </Elements>
  )
}
