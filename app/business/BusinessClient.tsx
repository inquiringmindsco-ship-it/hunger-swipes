'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Smartphone, Utensils, Eye, Heart, Store, QrCode } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'

const BENEFITS = [
  {
    icon: <Eye size={22} className="text-hs-gold" />,
    title: 'Food-first discovery',
    body: 'Customers see your dishes first, not a giant list of restaurant names.',
  },
  {
    icon: <Heart size={22} className="text-hs-gold" />,
    title: 'Swipe right = want it',
    body: 'People swipe through food like they browse everything else. Right swipe means they want it.',
  },
  {
    icon: <Smartphone size={22} className="text-hs-gold" />,
    title: 'Visual menu that sells',
    body: 'Photos, descriptions, and prices become a discoverable, shareable feed.',
  },
  {
    icon: <Store size={22} className="text-hs-gold" />,
    title: 'Your restaurant, your QR',
    body: 'Get a short permanent URL and QR code customers scan to see your food instantly.',
  },
]

export default function BusinessClient() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_name.trim() || !form.contact_name.trim() || !form.phone.trim() || !form.email.trim() || !form.address.trim()) {
      setError('Business name, contact name, phone, email, and address are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/business-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      sessionStorage.setItem('hungerswipes_business_intake', JSON.stringify(form))
      router.push('/join?seller_type=restaurant')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hs-ink flex flex-col pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/swipe" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Hunger Swipes</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        {!submitted ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-hs-gold/10 flex items-center justify-center mx-auto mb-4">
                <Utensils size={32} className="text-hs-gold" />
              </div>
              <h1 className="text-3xl font-black text-hs-cream mb-3 leading-tight">
                Get your restaurant on Hunger Swipes
              </h1>
              <p className="text-hs-gray text-sm leading-relaxed">
                Put your food in front of people who are actively looking for their next meal — and let them swipe right on what they want.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex gap-4 bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
                  <div className="mt-0.5">{b.icon}</div>
                  <div>
                    <h3 className="font-bold text-hs-cream text-sm">{b.title}</h3>
                    <p className="text-hs-gray text-sm mt-0.5 leading-relaxed">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5 mb-8">
              <h2 className="text-lg font-black text-hs-cream mb-1 flex items-center gap-2">
                <QrCode size={20} className="text-hs-gold" /> Join Hunger Swipes
              </h2>
              <p className="text-xs text-hs-gray mb-5">Start with the essentials, then create or connect your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-hs-silver mb-1.5">Business name *</label>
                  <input
                    type="text"
                    value={form.business_name}
                    onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                    placeholder="Renee's"
                    className="w-full px-4 py-3 bg-hs-soft border border-white/[0.06] rounded-xl text-hs-cream placeholder:text-hs-muted focus:outline-none focus:border-hs-gold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hs-silver mb-1.5">Contact name *</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-hs-soft border border-white/[0.06] rounded-xl text-hs-cream placeholder:text-hs-muted focus:outline-none focus:border-hs-gold text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-hs-silver mb-1.5">Phone *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="(314) 555-0100"
                      className="w-full px-4 py-3 bg-hs-soft border border-white/[0.06] rounded-xl text-hs-cream placeholder:text-hs-muted focus:outline-none focus:border-hs-gold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-hs-silver mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@restaurant.com"
                      className="w-full px-4 py-3 bg-hs-soft border border-white/[0.06] rounded-xl text-hs-cream placeholder:text-hs-muted focus:outline-none focus:border-hs-gold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hs-silver mb-1.5">Address *</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, St. Louis, MO"
                    className="w-full px-4 py-3 bg-hs-soft border border-white/[0.06] rounded-xl text-hs-cream placeholder:text-hs-muted focus:outline-none focus:border-hs-gold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-hs-silver mb-1.5">Website or social link</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-hs-soft border border-white/[0.06] rounded-xl text-hs-cream placeholder:text-hs-muted focus:outline-none focus:border-hs-gold text-sm"
                  />
                </div>

                {error && <p className="text-hs-red text-xs font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition ${loading ? 'bg-hs-graphite text-hs-muted' : 'bg-hs-gold text-hs-black hover:bg-hs-gold-light'}`}
                >
                  {loading ? 'Creating your setup…' : 'GET YOUR RESTAURANT ON HUNGER SWIPES'}
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-hs-gray">
              Already have a restaurant account?{' '}
              <Link href="/seller/dashboard" className="text-hs-gold font-semibold hover:underline">
                Go to dashboard
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-hs-gold/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={40} className="text-hs-gold" />
            </div>
            <h1 className="text-2xl font-black text-hs-cream mb-3">You&apos;re in the queue</h1>
            <p className="text-hs-gray text-sm leading-relaxed mb-6">
              Thanks for your interest. We&apos;ll review your restaurant and send your dashboard link so you can add dishes, photos, and prices.
            </p>
            <button
              onClick={() => router.push('/swipe')}
              className="px-6 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm"
            >
              Browse Hunger Swipes
            </button>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
