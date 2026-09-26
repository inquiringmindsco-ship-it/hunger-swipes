'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { BrandMark } from '@/app/components/icons/HungerIcons'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const supabase = getSupabase()
    if (!supabase) { setError('Authentication is unavailable.'); setBusy(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('This recovery link is expired. Request a new one.'); setBusy(false); return }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) return setError(updateError.message)
    router.replace('/auth?message=password_updated')
  }

  return <div className="min-h-screen bg-hs-ink px-4 py-8 text-hs-cream"><main className="mx-auto max-w-md"><Link href="/swipe" className="flex items-center gap-2"><BrandMark size={30} /><span className="font-bold">Hunger Swipes</span></Link><section className="mt-10 rounded-[1.5rem] border border-white/[0.06] bg-hs-charcoal p-6"><h1 className="text-2xl font-black">Choose a new password</h1><p className="mt-2 text-sm text-hs-gray">Use at least eight characters.</p>{error && <p role="alert" className="mt-4 rounded-xl border border-hs-red/30 bg-hs-red/10 p-3 text-sm text-hs-red">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-bold uppercase tracking-wider text-hs-gold">New password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-hs-soft px-4 py-3.5 text-hs-cream" /></label><label className="block text-xs font-bold uppercase tracking-wider text-hs-gold">Confirm password<input type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-hs-soft px-4 py-3.5 text-hs-cream" /></label><button disabled={busy} className="w-full rounded-2xl bg-hs-gold py-4 font-bold text-hs-black disabled:opacity-50">{busy ? 'Updating…' : 'Update Password'}</button></form></section></main></div>
}
