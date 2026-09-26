'use client'

import { ExternalLink, MapPin, Phone } from 'lucide-react'
import { formatPhone, getAppleMapsUrl, getCallUrl, getGoogleMapsUrl, safePlaceWebUrl, type ActionablePlace } from '@/lib/place-actions'

export default function PlaceActions({ place, compact = false }: { place: ActionablePlace; compact?: boolean }) {
  const call = getCallUrl(place)
  const website = safePlaceWebUrl(place.website)
  const order = safePlaceWebUrl(place.order_url)
  const button = compact
    ? 'rounded-xl bg-hs-soft px-2.5 py-2 text-xs font-bold text-hs-cream hover:bg-hs-graphite transition'
    : 'rounded-xl bg-hs-soft px-4 py-3 text-sm font-bold text-hs-cream hover:bg-hs-graphite transition'
  return (
    <div className="flex flex-wrap items-center gap-2">
      {order && (
        <a
          href={order}
          target="_blank"
          rel="noreferrer"
          className={`${button} bg-hs-gold text-hs-black hover:bg-hs-gold-light`}
        >
          Order
        </a>
      )}
      <details className="relative">
        <summary className={`${button} flex cursor-pointer list-none items-center gap-1 text-hs-gold`}>
          <MapPin size={compact ? 13 : 16} /> Directions
        </summary>
        <div className="absolute bottom-full left-0 z-20 mb-2 w-44 overflow-hidden rounded-2xl border border-white/[0.08] bg-hs-charcoal p-1 shadow-card">
          <a
            href={getAppleMapsUrl(place)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl px-3 py-2 text-sm text-hs-cream hover:bg-hs-soft"
          >
            Apple Maps
          </a>
          <a
            href={getGoogleMapsUrl(place)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl px-3 py-2 text-sm text-hs-cream hover:bg-hs-soft"
          >
            Google Maps
          </a>
        </div>
      </details>
      {call && (
        <a href={call} className={`${button} flex items-center gap-1 text-hs-gold`}>
          <Phone size={compact ? 13 : 16} /> {compact ? 'Call' : formatPhone(place.phone)}
        </a>
      )}
      {!compact && website && (
        <a
          href={website}
          target="_blank"
          rel="noreferrer"
          className={`${button} flex items-center gap-1`}
        >
          <ExternalLink size={15} /> Website
        </a>
      )}
    </div>
  )
}
