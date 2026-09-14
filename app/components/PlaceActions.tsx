'use client'

import { ExternalLink, MapPin, Phone } from 'lucide-react'
import { formatPhone, getAppleMapsUrl, getCallUrl, getGoogleMapsUrl, safePlaceWebUrl, type ActionablePlace } from '@/lib/place-actions'

export default function PlaceActions({ place, compact = false }: { place: ActionablePlace; compact?: boolean }) {
  const call = getCallUrl(place)
  const website = safePlaceWebUrl(place.website)
  const order = safePlaceWebUrl(place.order_url)
  const button = compact ? 'rounded-lg bg-white/10 px-2.5 py-2 text-xs font-bold' : 'rounded-xl bg-white/10 px-4 py-3 text-sm font-bold'
  return <div className="flex flex-wrap items-center gap-2">
    {order && <a href={order} target="_blank" rel="noreferrer" className={`${button} bg-[#FF5722] text-white`}>Order</a>}
    <details className="relative"><summary className={`${button} flex cursor-pointer list-none items-center gap-1 text-[#FFD700]`}><MapPin size={compact ? 13 : 16} /> Directions</summary><div className="absolute bottom-full left-0 z-20 mb-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#1b1b1b] p-1 shadow-xl"><a href={getAppleMapsUrl(place)} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">Apple Maps</a><a href={getGoogleMapsUrl(place)} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">Google Maps</a></div></details>
    {call && <a href={call} className={`${button} flex items-center gap-1 text-[#FFD700]`}><Phone size={compact ? 13 : 16} /> {compact ? 'Call' : formatPhone(place.phone)}</a>}
    {!compact && website && <a href={website} target="_blank" rel="noreferrer" className={`${button} flex items-center gap-1`}><ExternalLink size={15} /> Website</a>}
  </div>
}
