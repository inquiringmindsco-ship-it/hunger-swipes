'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Check, ChefHat, LocateFixed, MapPin, Search, ChevronRight, Store } from 'lucide-react'
import MobileNav from '@/app/components/MobileNav'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { useAuth } from '@/lib/auth'
import { authFetch, apiFetch } from '@/lib/auth-fetch'
import { pickImage } from '@/lib/image-picker'
import { LoadingState } from '@/app/components/ui/LoadingState'
import Head from 'next/head'
import type { AddressSuggestion } from '@/lib/address-search'

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
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null)
  const [addressSearching, setAddressSearching] = useState(false)
  const [addressSearched, setAddressSearched] = useState(false)
  const [newPlacePhone, setNewPlacePhone] = useState('')
  const [dishName, setDishName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [postingType, setPostingType] = useState<'restaurant' | null>(null)

  useEffect(() => { if (!authLoading && !user) router.replace('/auth?next=/post') }, [authLoading, user, router])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('place') || ''
    if (requested || params.get('type') === 'restaurant') setPostingType('restaurant')
    setRequestedPlaceId(requested)
    setPlaceId(requested)
    if (requested) {
      // Pre-load only the requested place from URL
      setSearching(true)
      apiFetch(`/api/places?id=${encodeURIComponent(requested)}`)
        .then((response) => response.json())
        .then((data) => { setPlaces(data.places || []) })
        .catch(() => { setPlaces([]) })
        .finally(() => { setSearching(false) })
    } else {
      setPlaces([])
    }
  }, [])
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Do not dump the full place list before the user has typed or requested location.
      if (!query.trim() && !coordinates) {
        if (!requestedPlaceId) setPlaces([])
        return
      }
      setSearching(true)
      try {
        const params = new URLSearchParams({ limit: '30' })
        if (requestedPlaceId && !query.trim()) params.set('id', requestedPlaceId)
        if (query.trim()) params.set('q', query.trim())
        if (coordinates) { params.set('lat', String(coordinates.lat)); params.set('lng', String(coordinates.lng)) }
        const endpoint = coordinates && !query.trim() && !requestedPlaceId ? `/api/nearby?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=15` : `/api/places?${params}`
        const response = await apiFetch(endpoint)
        const data = await response.json()
        setPlaces(data.places || [])
      } catch { setPlaces([]) } finally { setSearching(false) }
    }, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query, coordinates, requestedPlaceId])

  async function handlePickPhoto(source?: 'camera' | 'photos' | 'prompt') {
    const picked = await pickImage({ source: source || 'prompt' })
    if (!picked) return
    setFile(picked.file)
    setPreviewUrl(picked.previewUrl)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    if (selected) {
      const url = URL.createObjectURL(selected)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  function useLocation() {
    if (!navigator.geolocation) return setError('Location is not available in this browser')
    navigator.geolocation.getCurrentPosition(position => {
      setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude })
      setError('')
    }, () => setError('Location was not shared. You can still search by name, food type, or area.'), { timeout: 10000, maximumAge: 300000 })
  }

  async function searchAddress() {
    const address = location.trim()
    if (address.length < 5) return setError('Enter a fuller street address, including city/state or ZIP when possible')
    setAddressSearching(true)
    setAddressSearched(false)
    setError('')
    try {
      const params = new URLSearchParams({ q: address })
      if (coordinates) {
        params.set('lat', String(coordinates.lat))
        params.set('lng', String(coordinates.lng))
      }
      const response = await authFetch(`/api/places/address-search?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not search addresses')
      setAddressSuggestions(data.suggestions || [])
      setAddressSearched(true)
    } catch (err: any) {
      setAddressSuggestions([])
      setAddressSearched(true)
      setError(err.message || 'Could not search addresses')
    } finally {
      setAddressSearching(false)
    }
  }

  function chooseAddress(suggestion: AddressSuggestion) {
    setSelectedAddress(suggestion)
    setLocation(suggestion.formattedAddress)
    setAddressSuggestions([])
    setAddressSearched(false)
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) return setError('Choose a food photo')
    if (!placeId && (!manual || !newPlace.trim() || !location.trim())) return setError('Select a real place, or add one with its name and location')
    if (!placeId && !selectedAddress) return setError('Search the address and choose a suggestion so people nearby can find this food')
    setBusy(true); setError('')
    try {
      let resolvedPlaceId = placeId
      if (!resolvedPlaceId) {
        const response = await authFetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newPlace,
            location_text: location,
            phone: newPlacePhone,
            address: selectedAddress?.formattedAddress || location,
            city: selectedAddress?.city,
            state: selectedAddress?.state,
            postal_code: selectedAddress?.postalCode,
            latitude: selectedAddress?.latitude,
            longitude: selectedAddress?.longitude,
          }),
        })
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Post</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) return null

  if (!postingType) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Post</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-hs-gold">Choose a post type</p>
          <h1 className="mt-2 text-3xl font-black text-hs-cream">What are you posting?</h1>
          <p className="mt-2 text-sm text-hs-gray">Pick the option that matches where the food came from.</p>
          <div className="mt-7 grid gap-4">
            <button
              type="button"
              onClick={() => setPostingType('restaurant')}
              className="w-full rounded-[1.5rem] border border-white/[0.08] bg-hs-charcoal p-5 text-left hover:border-hs-gold/40 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-hs-gold/10 text-hs-gold flex items-center justify-center"><Store size={24} /></div>
                <div className="flex-1">
                  <h2 className="font-bold text-hs-cream">Restaurant dish</h2>
                  <p className="mt-1 text-xs text-hs-gray">Share food you tried at a restaurant or local place.</p>
                </div>
                <ChevronRight size={20} className="text-hs-gray" />
              </div>
            </button>
            <Link
              href="/seller/dishes/new"
              className="w-full rounded-[1.5rem] border border-hs-gold/25 bg-hs-gold/10 p-5 text-left hover:border-hs-gold/50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-hs-gold text-hs-black flex items-center justify-center"><ChefHat size={24} /></div>
                <div className="flex-1">
                  <h2 className="font-bold text-hs-cream">My own food</h2>
                  <p className="mt-1 text-xs text-hs-gray">List food you make or sell. Every dish is reviewed before it goes live.</p>
                </div>
                <ChevronRight size={20} className="text-hs-gold" />
              </div>
            </Link>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Post a Dish — Hunger Swipes</title>
        <meta name="description" content="Share a food photo from a real place on Hunger Swipes." />
      </Head>
      <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-base text-hs-cream tracking-tight">Post a Dish</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <button type="button" onClick={() => setPostingType(null)} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-hs-gold">
          <ArrowLeft size={17} /> Change post type
        </button>
        <p className="text-sm text-hs-gray mb-6">
          Share your own food photo from a real place. Community posts are clearly labeled.
        </p>

        {error && (
          <div className="mb-5 rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          <section>
            <button type="button" onClick={() => handlePickPhoto()} className="mb-3 block min-h-11 text-xs font-semibold uppercase tracking-wider text-hs-gold">Photo</button>
            <label
              htmlFor="photo"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); document.getElementById('photo')?.click() } }}
              className="group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-white/15 bg-hs-charcoal hover:border-hs-gold/40 focus-within:border-hs-gold focus-within:ring-2 focus-within:ring-hs-gold/50 transition"
            >
              {previewUrl ? (
                <img src={previewUrl} alt={`Preview of ${dishName || 'food photo to post'}`} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-hs-gray group-hover:text-hs-cream transition">
                  <div className="w-14 h-14 rounded-full bg-hs-soft flex items-center justify-center mb-3">
                    <Camera size={24} aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium">Add food photo</p>
                  <p className="text-xs text-hs-muted mt-1">JPEG, PNG, WebP · max 5 MB</p>
                </div>
              )}
              <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoChange} required />
            </label>
          </section>

          <section>
            <label htmlFor="dish" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Dish Name</label>
            <input
              id="dish"
              value={dishName}
              onChange={e => setDishName(e.target.value)}
              minLength={2}
              maxLength={160}
              required
              placeholder="What did you eat?"
              className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </section>

          <section>
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Place</label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 text-hs-gray" size={18} />
                <input
                  aria-label="Search places"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setManual(false) }}
                  className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal py-3.5 pl-11 pr-4 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                  placeholder="Search restaurants, food, area…"
                />
              </div>
              <button
                type="button"
                onClick={useLocation}
                aria-label="Use my location"
                title="Use my location"
                className="w-12 h-12 rounded-2xl border border-white/[0.08] bg-hs-charcoal flex items-center justify-center text-hs-gold hover:bg-hs-soft transition"
              >
                <LocateFixed size={20} />
              </button>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-hide rounded-2xl border border-white/[0.06] bg-hs-charcoal p-3">
              {searching ? (
                <p className="text-sm text-hs-gray p-3">Searching…</p>
              ) : places.length === 0 ? (
                <div className="space-y-2 p-2">
                  {!query.trim() && !coordinates && !requestedPlaceId && (
                    <>
                      <p className="text-sm text-hs-gray">Search by place name, food type, or area, or use your location.</p>
                      <button
                        type="button"
                        onClick={useLocation}
                        className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-hs-gold hover:text-hs-gold-light transition"
                      >
                        <LocateFixed size={16} /> Use my location
                      </button>
                    </>
                  )}
                  {(query.trim() || coordinates || requestedPlaceId) && <p className="text-sm text-hs-gray">No places found. Try a different search or add a new place below.</p>}
                </div>
              ) : (
                places.map(place => (
                  <button
                    type="button"
                    key={place.id}
                    onClick={() => { setPlaceId(place.id); setRequestedPlaceId(''); setManual(false) }}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      placeId === place.id
                        ? 'border-hs-gold bg-hs-gold/10'
                        : 'border-white/[0.06] bg-hs-charcoal hover:bg-hs-soft'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-hs-cream text-sm">{place.name}</p>
                        <p className="text-xs text-hs-gray mt-0.5">{place.address || place.location_text}</p>
                        <p className="text-[11px] text-hs-muted mt-1">
                          {[place.cuisine, place.category].filter(Boolean).join(' · ') || 'Food place'}
                          {place.distanceMiles != null && ` · ${place.distanceMiles} mi`}
                        </p>
                      </div>
                      {placeId === place.id && <Check className="text-hs-gold shrink-0" size={20} />}
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => { setManual(true); setPlaceId('') }}
              className="mt-3 text-sm font-semibold text-hs-gold hover:text-hs-gold-light transition"
            >
              Can’t find it? Add a real place
            </button>
          </section>

          {manual && (
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="new-place" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Place Name</label>
                <input
                  id="new-place"
                  value={newPlace}
                  onChange={e => setNewPlace(e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                  required={manual}
                />
              </div>
              <div>
                <label htmlFor="location" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">City / Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 text-hs-gray" size={18} />
                  <input
                    id="location"
                    value={location}
                    onChange={e => {
                      setLocation(e.target.value)
                      setSelectedAddress(null)
                      setAddressSuggestions([])
                      setAddressSearched(false)
                    }}
                    autoComplete="street-address"
                    placeholder="Street address, city/state or ZIP"
                    className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal py-3.5 pl-11 pr-4 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                    required={manual}
                  />
                </div>
                <button
                  type="button"
                  onClick={searchAddress}
                  disabled={addressSearching || location.trim().length < 5}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-hs-gold/30 px-3 py-2 text-sm font-semibold text-hs-gold disabled:opacity-50"
                >
                  <Search size={16} /> {addressSearching ? 'Checking address…' : 'Find full address'}
                </button>
                <p className="mt-2 text-xs text-hs-muted">Include the city/state or ZIP for the most accurate match.</p>
                {addressSuggestions.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-2xl border border-white/[0.08] bg-hs-soft p-2">
                    {addressSuggestions.map(suggestion => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => chooseAddress(suggestion)}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-hs-cream hover:bg-white/[0.06]"
                      >
                        {suggestion.formattedAddress}
                      </button>
                    ))}
                    <p className="px-3 pt-1 text-[10px] text-hs-muted">© OpenStreetMap contributors</p>
                  </div>
                )}
                {addressSearched && addressSuggestions.length === 0 && !addressSearching && (
                  <p className="mt-2 text-xs text-hs-gray">No matching address found. Add city/state or ZIP and try again, or keep the address you entered.</p>
                )}
                {selectedAddress && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-hs-success"><Check size={14} /> Full address selected</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-2 block">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={newPlacePhone}
                  onChange={e => setNewPlacePhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
                />
              </div>
            </section>
          )}

          <section>
            <label htmlFor="description" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Description <span className="text-hs-gray font-normal normal-case">(optional)</span></label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What made it good?"
              className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition resize-none"
            />
          </section>

          <section>
            <label htmlFor="price" className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Price <span className="text-hs-gray font-normal normal-case">(optional)</span></label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal px-4 py-3.5 text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none transition"
            />
          </section>

          <section className="pt-2">
            <button
              disabled={busy || authLoading}
              className="w-full rounded-2xl bg-hs-gold px-5 py-4 font-bold text-hs-black hover:bg-hs-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? 'Publishing…' : <>Publish Food Post <ChevronRight size={18} /></>}
            </button>
            <p className="text-center text-xs text-hs-gray mt-4">
              Own the business?{' '}
              <Link href="/join" className="text-hs-gold hover:text-hs-gold-light transition">Create a seller listing</Link>.
            </p>
          </section>
        </form>
      </main>
      <MobileNav />
    </div>
    </>
  )
}
