'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ForkFlame, MapPin, Dollar, Star, Verified, Heart, ArrowRight, Fork, Trophy, Bookmark, StarFilled } from '@/app/components/HwIcon'
import { BrandMark } from '@/app/components/icons/HungerIcons'

interface Vendor {
  id: string
  name: string
  description: string
  location_text: string
  address: string
  city: string
  neighborhood: string
  cuisine_type: string
  price_range: string
  image_url: string
  cover_image_url: string
  discount_offer: string
  discount_code: string
  minimum_order: number
  active: boolean
  verified: boolean
  mock?: boolean
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [claimedCodes, setClaimedCodes] = useState<Record<string, boolean>>({})
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    fetchVendors()
  }, [])

  async function fetchVendors() {
    try {
      const res = await fetch('/api/vendors')
      const data = await res.json()
      setVendors(data.vendors || [])
    } catch {
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const cities = ['all', ...Array.from(new Set(vendors.map(v => v.city).filter(Boolean)))]
  const neighborhoods = ['all', ...Array.from(new Set(vendors.map(v => v.neighborhood).filter(Boolean)))]

  const filtered = vendors.filter(v => {
    if (filter === 'verified' && !v.verified) return false
    if (filter === 'discount' && !v.discount_offer) return false
    if (cityFilter !== 'all' && v.city !== cityFilter) return false
    if (filter !== 'all' && filter !== 'verified' && filter !== 'discount') return false
    return true
  })

  function claimCode(vendorId: string, code: string) {
    setClaimedCodes(prev => ({ ...prev, [vendorId]: true }))
    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
  }

  const priceRangeColor = (p: string) => {
    if (p === '$') return 'text-green-400'
    if (p === '$$') return 'text-yellow-400'
    if (p === '$$$') return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark size={40} aria-label="HungerSwipes" />
          <span className="font-bold text-xl tracking-tight">HungerSwipes</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/swipe" className="text-gray-400 hover:text-white transition font-medium text-sm">
            <ForkFlame size={18} /> Swipe
          </Link>
          <Link href="/matches" className="text-gray-400 hover:text-white transition font-medium text-sm">
            Matches
          </Link>
          <Link href="/creator" className="text-gray-400 hover:text-white transition font-medium text-sm">
            For Creators
          </Link>
          <Link
            href="/auth"
            className="px-4 py-2 bg-[#FF6A00] text-white rounded-full font-semibold hover:bg-[#E05A00] transition text-sm"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-8 pb-12 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6A00]/15 rounded-full text-[#FF6A00] font-semibold text-sm mb-6">
          <Dollar size={18} /> Vendors with special offers
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Show a photo. <span className="text-[#FFD500]">Get rewarded.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
          Swipe through vendors below. Tap a discount to reveal your code, then show it when you order.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {[
            { key: 'all', label: 'All Vendors' },
            { key: 'discount', label: 'Has Discount' },
            { key: 'verified', label: 'Verified' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                filter === f.key
                  ? 'bg-[#FF6A00] text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}

          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-[#1A1A1A] text-gray-300 border border-white/10 focus:outline-none"
          >
            {cities.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Vendor Grid */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#141414] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-[#1A1A1A]" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-[#1A1A1A] rounded w-3/4" />
                  <div className="h-4 bg-[#1A1A1A] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ForkFlame size={48} style={{ opacity: 0.3 }} />
            <p className="text-gray-500 mt-4">No vendors found in this category yet.</p>
            <p className="text-gray-600 text-sm mt-1">Check back soon — vendors join every week.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(vendor => (
              <div
                key={vendor.id}
                className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 card-hover"
                onMouseEnter={() => setHoveredCard(vendor.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Cover image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={vendor.cover_image_url || vendor.image_url}
                    alt={vendor.name}
                    className="w-full h-full object-cover transition-transform duration-500"
                    style={{ transform: hoveredCard === vendor.id ? 'scale(1.05)' : 'scale(1)' }}
                  />
                  {/* Discount badge */}
                  {vendor.discount_offer && (
                    <div className="absolute top-3 left-3 bg-[#FFD500] text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Dollar size={12} /> {vendor.discount_offer.split(' ').slice(0, 3).join(' ')}
                    </div>
                  )}
                  {/* Verified badge */}
                  {vendor.verified && (
                    <div className="absolute top-3 right-3 bg-[#FF6A00] p-1.5 rounded-full">
                      <Verified size={16} />
                    </div>
                  )}
                  {/* Price range */}
                  <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 rounded text-xs font-bold">
                    <span className={priceRangeColor(vendor.price_range)}>{vendor.price_range}</span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg leading-tight">{vendor.name}</h3>
                    {vendor.cuisine_type && (
                      <span className="text-xs text-[#FF6A00] bg-[#FF6A00]/15 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                        {vendor.cuisine_type}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{vendor.description}</p>

                  <div className="flex items-center gap-1 text-gray-500 text-xs mb-4">
                    <MapPin size={12} />
                    <span>{vendor.location_text || vendor.address || vendor.neighborhood}</span>
                  </div>

                  {/* Discount code reveal */}
                  {vendor.discount_offer && vendor.discount_code && (
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#FFD500]/20">
                      <p className="text-xs text-[#FFD500] font-semibold mb-2 uppercase tracking-wide">
                        Your Discount Code
                      </p>
                      {claimedCodes[vendor.id] ? (
                        <div className="flex items-center justify-between">
                          <div className="bg-[#FFD500]/20 rounded-lg px-4 py-2">
                            <span className="text-[#FFD500] font-mono font-bold text-lg tracking-widest">
                              {vendor.discount_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-green-400 text-xs">
                            <Verified size={14} />
                            <span>Copied!</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => claimCode(vendor.id, vendor.discount_code)}
                          className="w-full py-2.5 bg-[#FFD500] hover:bg-[#E0BB00] text-black font-bold rounded-lg transition text-sm"
                        >
                          Tap to Reveal Code
                        </button>
                      )}
                      {vendor.minimum_order && (
                        <p className="text-gray-600 text-xs mt-2">
                          Min. order ${vendor.minimum_order}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={`/swipe?vendor=${vendor.id}`}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#FF6A00]/15 hover:bg-[#FF6A00]/25 text-[#FF6A00] rounded-xl font-semibold transition text-sm"
                  >
                    <ForkFlame size={16} />
                    Swipe Their Food
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vendor CTA */}
      <section className="px-6 py-20 bg-[#111] border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <ForkFlame size={48} style={{ opacity: 0.8 }} />
          <h2 className="text-3xl font-extrabold mt-4 mb-3">Own a food business?</h2>
          <p className="text-gray-400 mb-8">
            List on HungerSwipes. Get your discount in front of hungry eaters who already love your food.
            Pay only when a photo drives a customer to you.
          </p>
          <Link
            href="/auth?role=restaurant"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF6A00] text-white rounded-full font-bold text-lg hover:bg-[#E05A00] transition"
          >
            List My Business <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  )
}
