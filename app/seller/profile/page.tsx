'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { LoadingState } from '@/app/components/ui/LoadingState'
import MobileNav from '@/app/components/MobileNav'

const empty = {
  business_name: '', contact_name: '', contact_email: '', phone: '', address: '', location_text: '', website_url: '',
  description: '', hours_text: '', ordering_method: 'none', ordering_url: '', pickup_available: false, delivery_available: false,
}

export default function SellerProfilePage() {
  const router = useRouter()
  const [seller, setSeller] = useState<any>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    authFetch('/api/sellers?mine=true').then(async (response) => {
      if (response.status === 401) return router.replace('/auth?next=%2Fseller%2Fprofile')
      const body = await response.json()
      if (!body.seller) return router.replace('/join')
      setSeller(body.seller)
      setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, body.seller[key] ?? (typeof (empty as any)[key] === 'boolean' ? false : '')])) as typeof empty)
      setLoading(false)
    }).catch(() => { setError('Unable to load your restaurant profile.'); setLoading(false) })
  }, [router])

  const update = (key: keyof typeof empty, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    if (!seller) return
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await authFetch(`/api/sellers?id=${seller.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not save profile')
      setSeller(body.seller); setMessage('Restaurant profile saved.')
    } catch (reason: any) { setError(reason.message || 'Could not save profile') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-screen bg-hs-ink px-4 pt-12 pb-24"><LoadingState label="Loading restaurant profile…" /></div>

  const field = (key: keyof typeof empty, label: string, type = 'text', placeholder = '') => (
    <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-hs-gold">{label}</span><input type={type} value={String(form[key])} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 text-hs-cream outline-none focus:border-hs-gold/50" /></label>
  )

  return <div className="min-h-screen bg-hs-ink pb-24 text-hs-cream">
    <header className="safe-top sticky top-0 z-20 border-b border-white/[0.06] bg-hs-ink/95 px-4 py-3"><div className="mx-auto flex max-w-md items-center gap-3"><Link href="/seller/dashboard" className="flex h-11 w-11 items-center justify-center rounded-full bg-hs-soft" aria-label="Back"><ArrowLeft size={19} /></Link><BrandMark size={28} /><span className="font-bold">Restaurant setup</span></div></header>
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      {seller?.slug && <Link href={`/${seller.slug}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-hs-gold/25 bg-hs-gold/10 text-sm font-bold text-hs-gold">View public page <ExternalLink size={16} /></Link>}
      {error && <p className="rounded-xl border border-hs-red/30 bg-hs-red/10 p-3 text-sm text-hs-red">{error}</p>}
      {message && <p role="status" className="flex items-center gap-2 rounded-xl border border-hs-success/30 bg-hs-success/10 p-3 text-sm text-hs-success"><CheckCircle2 size={17} />{message}</p>}
      <section className="space-y-4"><h1 className="text-2xl font-black">Restaurant profile</h1>{field('business_name', 'Restaurant name')}{field('contact_name', 'Contact name')}<div className="grid gap-4 sm:grid-cols-2">{field('contact_email', 'Email', 'email')}{field('phone', 'Phone', 'tel')}</div>{field('address', 'Street address')}{field('location_text', 'Display location', 'text', 'Neighborhood, City')}{field('website_url', 'Website or social link', 'url', 'https://')}<label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-hs-gold">Description</span><textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 outline-none focus:border-hs-gold/50" /></label>{field('hours_text', 'Hours')}</section>
      <section className="space-y-4 border-t border-white/[0.07] pt-6"><h2 className="text-xl font-black">Ordering</h2><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-hs-gold">Ordering method</span><select value={form.ordering_method} onChange={(event) => update('ordering_method', event.target.value)} className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5"><option value="none">Not configured</option><option value="link">Online ordering link</option><option value="phone">Phone</option><option value="in_app">In-app (not yet available)</option></select></label>{form.ordering_method === 'link' && field('ordering_url', 'Secure order URL', 'url', 'https://')}<div className="grid grid-cols-2 gap-3">{(['pickup_available', 'delivery_available'] as const).map((key) => <label key={key} className="flex items-center gap-2 rounded-2xl bg-hs-charcoal p-4 text-sm font-semibold"><input type="checkbox" checked={form[key]} onChange={(event) => update(key, event.target.checked)} className="h-5 w-5 accent-hs-gold" />{key === 'pickup_available' ? 'Pickup' : 'Delivery'}</label>)}</div></section>
      <button onClick={save} disabled={saving} className="min-h-14 w-full rounded-2xl bg-hs-gold font-black text-hs-black disabled:opacity-50">{saving ? 'Saving…' : 'Save restaurant setup'}</button>
    </main>
    <MobileNav />
  </div>
}
