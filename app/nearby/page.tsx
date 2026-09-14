'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, LocateFixed, MapPin, Phone, Search, Store } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'

type Place = { id: string; name: string; location_text: string; address?: string; cuisine?: string; category?: string; phone?: string; website?: string; order_url?: string; claimed_status?: string; distanceMiles?: number; external_source?: string }

export default function NearbyPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [area, setArea] = useState('Ferguson')
  const [radius, setRadius] = useState(10)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Search by area, or use your location for real distance ranking.')

  async function load(url: string) {
    setLoading(true)
    try {
      const response = await fetch(url); const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Nearby search failed')
      setPlaces(data.places || []); setMessage(`${data.count || 0} real food places found`)
    } catch (error: any) { setPlaces([]); setMessage(error.message || 'Nearby search failed') } finally { setLoading(false) }
  }
  function searchArea(event?: FormEvent) { event?.preventDefault(); if (area.trim()) load(`/api/nearby?q=${encodeURIComponent(area.trim())}`) }
  function useLocation() {
    if (!navigator.geolocation) return setMessage('Location is unavailable. Search by area instead.')
    setMessage('Requesting your location…')
    navigator.geolocation.getCurrentPosition(position => load(`/api/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}&radius=${radius}`), () => setMessage('Location was not shared. Search by area instead.'), { timeout: 10000, maximumAge: 300000 })
  }

  return <div className="min-h-screen bg-[#0A0A0A] pb-24 text-white">
    <header className="border-b border-white/10 px-4 py-4"><div className="mx-auto flex max-w-2xl items-center justify-between"><Link href="/" className="flex items-center gap-2"><BrandMark size={36} /><span className="font-black">HungerSwipes</span></Link><Link href="/post" className="text-sm font-bold text-[#FF5722]">Post food</Link></div></header>
    <main className="mx-auto max-w-2xl px-4 py-7"><h1 className="flex items-center gap-2 text-3xl font-black"><MapPin className="text-[#FF5722]" /> Nearby Food</h1><p className="mt-2 text-sm text-gray-400">{message}</p>
      <form onSubmit={searchArea} className="mt-5 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-gray-500" size={18} /><input aria-label="Search city, area, cuisine, or place" value={area} onChange={e => setArea(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4" placeholder="Ferguson, pizza, Imo's…" /></div><button className="rounded-xl bg-[#FF5722] px-5 font-bold">Search</button></form>
      <div className="mt-3 flex items-center gap-2"><button onClick={useLocation} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold"><LocateFixed size={17} /> Use my location</button><label htmlFor="radius" className="text-xs text-gray-500">Within</label><select id="radius" value={radius} onChange={e => setRadius(Number(e.target.value))} className="rounded-lg border border-white/10 bg-[#171717] px-2 py-2 text-sm"><option value={5}>5 mi</option><option value={10}>10 mi</option><option value={25}>25 mi</option></select></div>
      {loading ? <p className="py-16 text-center text-gray-500">Finding real places…</p> : <div className="mt-6 space-y-3">{places.map(place => <article key={place.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{place.name}</h2><p className="mt-1 text-sm text-gray-400">{place.address || place.location_text}</p><p className="mt-1 text-xs text-gray-500">{[place.cuisine, place.category].filter(Boolean).join(' · ') || 'Food place'}</p></div>{place.distanceMiles != null && <span className="whitespace-nowrap rounded-full bg-[#FF5722]/15 px-2 py-1 text-xs font-bold text-[#FF5722]">{place.distanceMiles} mi</span>}</div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2 py-1 ${place.claimed_status === 'claimed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>{place.claimed_status === 'claimed' ? 'Claimed seller' : place.claimed_status === 'claim_pending' ? 'Claim pending' : 'Unclaimed Place'}</span>{place.phone && <a href={`tel:${place.phone}`} className="inline-flex items-center gap-1 text-[#FFD700]"><Phone size={13} /> Call</a>}{(place.order_url || place.website) && <a href={place.order_url || place.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#FFD700]"><ExternalLink size={13} /> Website</a>}<Link href={`/post?place=${place.id}`} className="ml-auto inline-flex items-center gap-1 font-bold text-[#FF5722]"><Store size={13} /> Post food here</Link>{place.claimed_status === 'unclaimed' && <Link href={`/claim?place=${place.id}`} className="text-gray-400 underline">Is this your business?</Link>}</div></article>)}</div>}
      {places.some(place => place.external_source === 'openstreetmap') && <p className="mt-6 text-xs text-gray-600">Place data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>, ODbL.</p>}
    </main><MobileNav />
  </div>
}
