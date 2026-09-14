'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Check, LocateFixed, MapPin, Search } from 'lucide-react'
import MobileNav from '@/app/components/MobileNav'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'

type Place = { id: string; name: string; location_text: string; address?: string; city?: string; state?: string; cuisine?: string; category?: string; claimed_status?: string; external_source?: string; distanceMiles?: number }

export default function CommunityPostPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [places, setPlaces] = useState<Place[]>([])
  const [placeId, setPlaceId] = useState('')
  const [requestedPlaceId, setRequestedPlaceId] = useState('')
  const [query, setQuery] = useState('')
  const [coordinates, setCoordinates] = useState<{lat: number; lng: number} | null>(null)
  const [searching, setSearching] = useState(false)
  const [manual, setManual] = useState(false)
  const [newPlace, setNewPlace] = useState('')
  const [location, setLocation] = useState('')
  const [dishName, setDishName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!authLoading && !user) router.replace('/auth?next=/post') }, [authLoading, user, router])
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('place') || ''
    setRequestedPlaceId(requested); setPlaceId(requested)
  }, [])
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ limit: '30' })
        if (requestedPlaceId && !query.trim()) params.set('id', requestedPlaceId)
        if (query.trim()) params.set('q', query.trim())
        if (coordinates) { params.set('lat', String(coordinates.lat)); params.set('lng', String(coordinates.lng)) }
        const response = await fetch(`/api/places?${params}`)
        const data = await response.json()
        setPlaces(data.places || [])
      } catch { setPlaces([]) } finally { setSearching(false) }
    }, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query, coordinates, requestedPlaceId])

  function useLocation() {
    if (!navigator.geolocation) return setError('Location is not available in this browser')
    navigator.geolocation.getCurrentPosition(position => {
      setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude })
      setError('')
    }, () => setError('Location was not shared. You can still search by name, food type, or area.'), { timeout: 10000, maximumAge: 300000 })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) return setError('Choose a food photo')
    if (!placeId && (!manual || !newPlace.trim() || !location.trim())) return setError('Select a real place, or add one with its name and location')
    setBusy(true); setError('')
    try {
      let resolvedPlaceId = placeId
      if (!resolvedPlaceId) {
        const response = await authFetch('/api/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newPlace, location_text: location }) })
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not create place'); resolvedPlaceId = data.place.id
      }
      const upload = new FormData(); upload.append('file', file); upload.append('folder', 'community-posts')
      const uploadResponse = await authFetch('/api/upload', { method: 'POST', body: upload })
      const uploadData = await uploadResponse.json(); if (!uploadResponse.ok) throw new Error(uploadData.error || 'Photo upload failed')
      const response = await authFetch('/api/community-posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ place_id: resolvedPlaceId, dish_name: dishName, description, photo_url: uploadData.url, price: price ? Number(price) : null }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not publish post')
      router.push('/swipe')
    } catch (err: any) { setError(err.message || 'Could not publish post') } finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-[#0D0D0D] pb-24 text-white">
    <header className="border-b border-white/10 px-4 py-4"><div className="mx-auto flex max-w-lg items-center gap-2"><BrandMark size={32} /><h1 className="text-xl font-black">Post what you ate</h1></div></header>
    <main className="mx-auto max-w-lg px-4 py-6"><p className="mb-6 text-sm text-gray-400">Share your own food photo from a real place. Community posts are clearly labeled and do not represent the business.</p>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <form onSubmit={submit} className="space-y-5">
        <div><label htmlFor="photo" className="mb-2 block text-sm font-bold">Food photo</label><label htmlFor="photo" className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-gray-400"><Camera className="mb-2" />{file ? file.name : 'JPEG, PNG, or WebP · max 5 MB'}</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} required /></div>
        <div><label htmlFor="dish" className="mb-2 block text-sm font-bold">What did you eat?</label><input id="dish" value={dishName} onChange={e => setDishName(e.target.value)} minLength={2} maxLength={160} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" placeholder="Dish name" /></div>
        <fieldset><legend className="mb-2 text-sm font-bold">Where was it from?</legend><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-gray-500" size={18} /><input aria-label="Search places" value={query} onChange={e => { setQuery(e.target.value); setManual(false) }} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4" placeholder="Imo's, pizza, Ferguson…" /></div><button type="button" onClick={useLocation} aria-label="Use my location" title="Use my location" className="rounded-xl border border-white/10 bg-white/5 px-4 text-[#FF5722]"><LocateFixed /></button></div>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{searching ? <p className="p-3 text-sm text-gray-500">Searching…</p> : places.map(place => <button type="button" key={place.id} onClick={() => { setPlaceId(place.id); setRequestedPlaceId(''); setManual(false) }} className={`w-full rounded-xl border p-3 text-left ${placeId === place.id ? 'border-[#FF5722] bg-[#FF5722]/10' : 'border-white/10 bg-white/5'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{place.name}</p><p className="mt-0.5 text-sm text-gray-400">{place.address || place.location_text}</p><p className="mt-1 text-xs text-gray-500">{[place.cuisine, place.category].filter(Boolean).join(' · ') || 'Food place'} · {place.claimed_status === 'claimed' ? 'Claimed seller' : 'Unclaimed Place'}</p></div>{placeId === place.id ? <Check className="text-[#FF5722]" size={20} /> : place.distanceMiles != null && <span className="whitespace-nowrap text-xs font-bold text-[#FFD700]">{place.distanceMiles} mi</span>}</div></button>)}</div>
          <button type="button" onClick={() => { setManual(true); setPlaceId('') }} className="mt-3 text-sm font-semibold text-[#FF5722]">Can’t find it? Add a real place</button>
          {places.some(place => place.external_source === 'openstreetmap') && <p className="mt-3 text-[11px] text-gray-600">Place data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, ODbL.</p>}
        </fieldset>
        {manual && <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="new-place" className="mb-2 block text-sm font-bold">Place name</label><input id="new-place" value={newPlace} onChange={e => setNewPlace(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" required={manual} /></div><div><label htmlFor="location" className="mb-2 block text-sm font-bold">City or address</label><div className="relative"><MapPin className="absolute left-3 top-3.5 text-gray-500" size={18} /><input id="location" value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4" required={manual} /></div></div></div>}
        <div><label htmlFor="description" className="mb-2 block text-sm font-bold">What made it good? <span className="font-normal text-gray-500">(optional)</span></label><textarea id="description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" /></div>
        <div><label htmlFor="price" className="mb-2 block text-sm font-bold">Price <span className="font-normal text-gray-500">(optional)</span></label><input id="price" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" /></div>
        <button disabled={busy || authLoading} className="w-full rounded-xl bg-[#FF5722] px-5 py-4 font-black disabled:opacity-50">{busy ? 'Publishing…' : 'Publish community food post'}</button><p className="text-center text-xs text-gray-500">Own the business? <Link href="/join" className="text-[#FF5722]">Create a seller listing</Link>.</p>
      </form>
    </main><MobileNav />
  </div>
}
