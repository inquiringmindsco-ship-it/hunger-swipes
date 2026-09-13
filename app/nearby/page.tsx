'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ForkFlame, MapPin, Dollar, Star, Verified, CheckLine, ArrowRight, Sparkle } from '@/app/components/HwIcon'
import { BrandMark } from '@/app/components/icons/HungerIcons'

interface Vendor {
  id: string
  name: string
  description: string
  location_text: string
  cuisine_type: string
  price_range: string
  image_url: string
  discount_offer?: string
  discount_code?: string
  distanceMiles?: number
  verified?: boolean
  latitude?: number
  longitude?: number
  mock?: boolean
}

export default function NearbyPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState(10)
  const [claimedCodes, setClaimedCodes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    requestLocation()
  }, [])

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      fetchNearby(38.653, -90.243) // default St. Louis
      return
    }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserLocation({ lat, lng })
        setLocationStatus('granted')
        fetchNearby(lat, lng)
      },
      () => {
        setLocationStatus('denied')
        fetchNearby(38.653, -90.243) // default St. Louis
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  async function fetchNearby(lat: number, lng: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
      const data = await res.json()
      setVendors(data.vendors || [])
    } catch {
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  function changeRadius(newRadius: number) {
    setRadius(newRadius)
    if (userLocation) {
      fetchNearby(userLocation.lat, userLocation.lng)
    } else {
      fetchNearby(38.653, -90.243)
    }
  }

  function claimCode(vendorId: string, code: string) {
    setClaimedCodes(prev => ({ ...prev, [vendorId]: true }))
    if (navigator.clipboard) navigator.clipboard.writeText(code)
  }

  const priceColor = (p: string) => {
    if (p === '$') return 'text-green-400'
    if (p === '$$') return 'text-yellow-400'
    if (p === '$$$') return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark size={40} aria-label="HungerSwipes" />
          <span className="font-black text-lg tracking-tight">HungerSwipes</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/vendors" className="text-gray-600 hover:text-white text-sm font-medium">All Vendors</Link>
          <Link href="/swipe" className="text-gray-600 hover:text-white text-sm font-medium">Swipe</Link>
          <Link href="/auth" className="px-4 py-2 bg-[#FF6A00] text-white rounded-full font-bold text-sm">Start</Link>
        </div>
      </nav>

      {/* Header */}
      <section className="px-6 pt-8 pb-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A00]/20 flex items-center justify-center">
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Nearby Food</h1>
            <p className="text-gray-600 text-sm">Vendors near you with HungerSwipes discounts</p>
          </div>
        </div>

        {/* Location status */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {locationStatus === 'requesting' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Getting your location…
            </div>
          )}
          {locationStatus === 'denied' && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500">Showing St. Louis area</div>
              <button onClick={requestLocation} className="text-sm text-[#FF6A00] font-semibold underline">
                Use my location
              </button>
            </div>
          )}
          {locationStatus === 'granted' && (
            <div className="flex items-center gap-2 text-sm text-[#10B981]">
              <MapPin size={14} />
              <span>Showing vendors near you</span>
            </div>
          )}

          {/* Radius filter */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Within</span>
            {[5, 10, 25].map(r => (
              <button
                key={r}
                onClick={() => changeRadius(r)}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                  radius === r
                    ? 'bg-[#FF6A00] text-white'
                    : 'bg-[#1A1A1A] text-gray-600 border border-white/10'
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor list */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#111] rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-24 h-24 rounded-xl bg-[#1A1A1A]" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-[#1A1A1A] rounded w-3/4" />
                  <div className="h-4 bg-[#1A1A1A] rounded w-1/2" />
                  <div className="h-4 bg-[#1A1A1A] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-20">
            <MapPin size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
            <p className="text-gray-500 mt-4">No vendors within {radius} miles.</p>
            <p className="text-gray-600 text-sm mt-1">Try increasing the radius or check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendors.map(vendor => (
              <div
                key={vendor.id}
                className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 card-hover"
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={vendor.image_url}
                      alt={vendor.name}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                    {vendor.distanceMiles !== undefined && (
                      <div className="absolute -top-1 -right-1 bg-[#FF6A00] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {vendor.distanceMiles} mi
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base truncate">{vendor.name}</h3>
                          {vendor.verified && (
                            <Verified size={14} />
                          )}
                        </div>
                        <p className="text-gray-600 text-sm truncate">{vendor.location_text}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={`font-bold ${priceColor(vendor.price_range)}`}>
                          {vendor.price_range}
                        </div>
                        {vendor.cuisine_type && (
                          <div className="text-xs text-[#FF6A00] mt-0.5">{vendor.cuisine_type}</div>
                        )}
                      </div>
                    </div>

                    {/* Discount code */}
                    {vendor.discount_offer && vendor.discount_code && (
                      <div className="mt-3">
                        {claimedCodes[vendor.id] ? (
                          <div className="flex items-center justify-between bg-[#FFD500]/10 border border-[#FFD500]/20 rounded-xl px-3 py-2">
                            <div>
                              <p className="text-xs text-[#FFD500] font-semibold">{vendor.discount_offer}</p>
                              <p className="text-[#FFD500] font-mono font-bold text-sm">{vendor.discount_code}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[#10B981] text-xs">
                              <CheckLine size={12} /> Copied
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => claimCode(vendor.id, vendor.discount_code!)}
                            className="w-full flex items-center justify-between bg-[#FFD500] hover:bg-[#E0BB00] text-[#0A0A0A] rounded-xl px-3 py-2 font-bold text-sm transition"
                          >
                            <span className="text-xs font-semibold">{vendor.discount_offer}</span>
                            <span className="font-mono">Tap to reveal</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    <div className="mt-2 flex gap-2">
                      <Link
                        href={`/swipe?vendor=${vendor.id}`}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#FF6A00]/15 hover:bg-[#FF6A00]/25 text-[#FF6A00] rounded-lg font-semibold text-sm transition"
                      >
                        <ForkFlame size={14} /> Swipe their food
                      </Link>
                      {vendor.latitude && vendor.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-600 rounded-lg text-sm transition"
                        >
                          <MapPin size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-[#111] border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          <Sparkle size={40} style={{ margin: '0 auto', opacity: 0.8 }} />
          <h2 className="text-2xl font-black mt-3 mb-2">Own a food business?</h2>
          <p className="text-gray-600 text-sm mb-5">
            List your discount on HungerSwipes and get found by hungry eaters nearby.
          </p>
          <Link
            href="/auth?role=restaurant"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6A00] text-white rounded-full font-bold text-sm hover:bg-[#E05A00] transition"
          >
            List My Business <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}
