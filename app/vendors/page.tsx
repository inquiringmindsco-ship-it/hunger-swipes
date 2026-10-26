'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, MapPin, PackageCheck, Search, Store, Truck } from 'lucide-react'
import { apiFetch } from '@/lib/auth-fetch'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import { DishImage } from '@/app/components/DishImage'
import MobileNav from '@/app/components/MobileNav'

type Vendor = {
  id: string; name: string; description: string; location: string; sellerType: string; sellerTypes: string[]
  logoUrl: string; coverUrl: string; pickupAvailable: boolean; deliveryAvailable: boolean; approved: boolean
  dishes: Array<{ id: string; name: string; photoUrl: string; price: number; category: string }>
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', home_kitchen: 'Home Cook', home_cook: 'Home Cook', food_truck: 'Food Truck',
  caterer: 'Caterer', pop_up: 'Pop-up', meal_prep: 'Meal Prep', recipe_creator: 'Recipe Creator', other: 'Food Seller',
}
const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'restaurant', label: 'Restaurants' },
  { key: 'home_cook', label: 'Home Cooks' }, { key: 'food_truck', label: 'Food Trucks' },
  { key: 'pickup', label: 'Pickup' }, { key: 'delivery', label: 'Delivery' },
] as const

function matchesType(vendor: Vendor, type: string) {
  const types = new Set([vendor.sellerType, ...(vendor.sellerTypes || [])])
  return type === 'home_cook' ? types.has('home_cook') || types.has('home_kitchen') : types.has(type)
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch('/api/vendors').then(async (response) => {
      if (!response.ok) throw new Error('Vendor directory unavailable')
      const data = await response.json()
      setVendors(Array.isArray(data.vendors) ? data.vendors : [])
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return vendors.filter((vendor) => {
      if (filter === 'pickup' && !vendor.pickupAvailable) return false
      if (filter === 'delivery' && !vendor.deliveryAvailable) return false
      if (!['all', 'pickup', 'delivery'].includes(filter) && !matchesType(vendor, filter)) return false
      return !term || `${vendor.name} ${vendor.description} ${vendor.location} ${vendor.dishes.map((dish) => dish.name).join(' ')}`.toLowerCase().includes(term)
    })
  }, [filter, search, vendors])

  return <div className="min-h-screen bg-hs-ink pb-24 text-hs-cream">
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-hs-ink/90 px-4 py-3 backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <Link href="/swipe" className="flex min-w-0 items-center gap-2"><BrandMark size={30} /><span className="truncate text-base font-bold">Local Food Sellers</span></Link>
        <Link href="/join" className="shrink-0 rounded-full bg-hs-gold px-4 py-2 text-xs font-bold text-hs-black">List Your Food</Link>
      </div>
    </header>
    <main className="mx-auto max-w-md px-4 py-5">
      <section className="mb-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-hs-gold">Eat local</p>
        <h1 className="text-3xl font-black tracking-tight">Food made near you</h1>
        <p className="mt-2 text-sm leading-relaxed text-hs-gray">Browse approved restaurants, home cooks, food trucks, and local sellers with food available now.</p>
      </section>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-hs-muted" size={17} aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sellers or food" className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-hs-charcoal pl-10 pr-4 text-sm text-hs-cream placeholder:text-hs-muted focus:border-hs-gold/50 focus:outline-none" />
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter food sellers">
        {FILTERS.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${filter === item.key ? 'bg-hs-gold text-hs-black' : 'border border-white/[0.08] bg-hs-soft text-hs-gray'}`}>{item.label}</button>)}
      </div>
      {loading ? <div className="space-y-4" aria-label="Loading sellers">{[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-hs-charcoal" />)}</div>
        : error ? <div className="rounded-3xl border border-hs-red/20 bg-hs-red/10 px-5 py-10 text-center"><p className="font-bold">We couldn’t load local sellers.</p><button onClick={() => location.reload()} className="mt-4 rounded-full bg-hs-soft px-5 py-2.5 text-sm font-bold">Try Again</button></div>
        : filtered.length === 0 ? <div className="rounded-3xl border border-white/[0.06] bg-hs-charcoal px-5 py-12 text-center"><Store className="mx-auto text-hs-gold" size={38} /><h2 className="mt-4 text-xl font-black">No food sellers match yet</h2><p className="mt-2 text-sm text-hs-gray">Try another filter or check back as more approved sellers add food.</p><button onClick={() => { setFilter('all'); setSearch('') }} className="mt-5 rounded-full bg-hs-gold px-6 py-3 text-sm font-bold text-hs-black">Show All Sellers</button></div>
        : <div className="space-y-4">{filtered.map((vendor) => <article key={vendor.id} className="overflow-hidden rounded-3xl border border-white/[0.07] bg-hs-charcoal shadow-card">
          <div className="relative aspect-[16/9] overflow-hidden bg-hs-soft">
            <DishImage src={vendor.coverUrl} alt={`${vendor.name} food`} sizes="(max-width: 480px) 100vw, 430px" className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-hs-black/80 px-2.5 py-1 text-[11px] font-bold backdrop-blur"><BadgeCheck size={13} className="text-hs-success" /> Approved seller</div>
            {vendor.dishes.length > 1 && <div className="absolute bottom-3 right-3 rounded-full bg-hs-black/80 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{vendor.dishes.length} dishes</div>}
          </div>
          <div className="p-4"><h2 className="truncate text-xl font-black">{vendor.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-hs-gray"><span className="font-semibold text-hs-gold">{TYPE_LABELS[vendor.sellerType] || 'Food Seller'}</span>{vendor.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{vendor.location}</span>}</div>
            {vendor.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-hs-gray">{vendor.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-hs-gray">{vendor.pickupAvailable && <span className="inline-flex items-center gap-1 rounded-full bg-hs-soft px-2.5 py-1.5"><PackageCheck size={13} /> Pickup</span>}{vendor.deliveryAvailable && <span className="inline-flex items-center gap-1 rounded-full bg-hs-soft px-2.5 py-1.5"><Truck size={13} /> Delivery</span>}</div>
            <Link href={`/swipe?sellerId=${vendor.id}`} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-hs-gold px-4 text-sm font-black text-hs-black">View Their Food <ArrowRight size={17} /></Link>
          </div>
        </article>)}</div>}
      <section className="mt-6 rounded-3xl border border-hs-gold/20 bg-hs-gold/10 p-5 text-center"><Store className="mx-auto text-hs-gold" size={30} /><h2 className="mt-3 text-lg font-black">Make or sell food?</h2><p className="mt-1 text-sm text-hs-gray">Create a seller profile and submit your dishes for approval.</p><Link href="/join" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-hs-gold px-6 text-sm font-bold text-hs-black">Start Your Listing</Link></section>
    </main>
    <MobileNav />
  </div>
}
