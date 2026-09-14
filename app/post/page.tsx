'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, MapPin } from 'lucide-react'
import MobileNav from '@/app/components/MobileNav'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'

type Place = { id: string; name: string; location_text: string }

export default function CommunityPostPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [places, setPlaces] = useState<Place[]>([])
  const [placeId, setPlaceId] = useState('')
  const [newPlace, setNewPlace] = useState('')
  const [location, setLocation] = useState('')
  const [dishName, setDishName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth?next=/post')
  }, [authLoading, user, router])

  useEffect(() => {
    fetch('/api/places?limit=50').then(r => r.json()).then(data => setPlaces(data.places || [])).catch(() => setPlaces([]))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) return setError('Choose a food photo')
    if (!placeId && (!newPlace.trim() || !location.trim())) return setError('Choose a place or add its name and location')
    setBusy(true)
    setError('')
    try {
      let resolvedPlaceId = placeId
      if (!resolvedPlaceId) {
        const placeResponse = await authFetch('/api/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newPlace, location_text: location }) })
        const placeData = await placeResponse.json()
        if (!placeResponse.ok) throw new Error(placeData.error || 'Could not create place')
        resolvedPlaceId = placeData.place.id
      }
      const upload = new FormData()
      upload.append('file', file)
      upload.append('folder', 'community-posts')
      const uploadResponse = await authFetch('/api/upload', { method: 'POST', body: upload })
      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok) throw new Error(uploadData.error || 'Photo upload failed')
      const postResponse = await authFetch('/api/community-posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: resolvedPlaceId, dish_name: dishName, description, photo_url: uploadData.url, price: price ? Number(price) : null }),
      })
      const postData = await postResponse.json()
      if (!postResponse.ok) throw new Error(postData.error || 'Could not publish post')
      router.push('/swipe')
    } catch (err: any) {
      setError(err.message || 'Could not publish post')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24 text-white">
      <header className="border-b border-white/10 px-4 py-4"><div className="mx-auto flex max-w-lg items-center gap-2"><BrandMark size={32} /><h1 className="text-xl font-black">Post what you ate</h1></div></header>
      <main className="mx-auto max-w-lg px-4 py-6">
        <p className="mb-6 text-sm text-gray-400">Share a real food photo from a real place. Community posts are clearly labeled and do not represent the business.</p>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="photo" className="mb-2 block text-sm font-bold">Food photo</label><label htmlFor="photo" className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-gray-400"><Camera className="mb-2" />{file ? file.name : 'JPEG, PNG, or WebP · max 5 MB'}</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} required /></div>
          <div><label htmlFor="dish" className="mb-2 block text-sm font-bold">What did you eat?</label><input id="dish" value={dishName} onChange={e => setDishName(e.target.value)} minLength={2} maxLength={160} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" placeholder="Dish name" /></div>
          <div><label htmlFor="place" className="mb-2 block text-sm font-bold">Where was it from?</label><select id="place" value={placeId} onChange={e => setPlaceId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3"><option value="">Add a place</option>{places.map(place => <option key={place.id} value={place.id}>{place.name} — {place.location_text}</option>)}</select></div>
          {!placeId && <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="new-place" className="mb-2 block text-sm font-bold">Place name</label><input id="new-place" value={newPlace} onChange={e => setNewPlace(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" placeholder="Restaurant, truck, market…" /></div><div><label htmlFor="location" className="mb-2 block text-sm font-bold">City or address</label><div className="relative"><MapPin className="absolute left-3 top-3.5 text-gray-500" size={18} /><input id="location" value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4" placeholder="Austin, TX" /></div></div></div>}
          <div><label htmlFor="description" className="mb-2 block text-sm font-bold">What made it good? <span className="font-normal text-gray-500">(optional)</span></label><textarea id="description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" /></div>
          <div><label htmlFor="price" className="mb-2 block text-sm font-bold">Price <span className="font-normal text-gray-500">(optional)</span></label><input id="price" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" /></div>
          <button disabled={busy || authLoading} className="w-full rounded-xl bg-[#FF5722] px-5 py-4 font-black disabled:opacity-50">{busy ? 'Publishing…' : 'Publish community food post'}</button>
          <p className="text-center text-xs text-gray-500">Are you posting on behalf of a business? <Link href="/join" className="text-[#FF5722]">Create a seller listing</Link>.</p>
        </form>
      </main>
      <MobileNav />
    </div>
  )
}
