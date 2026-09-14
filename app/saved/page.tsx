'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock3, MapPin, Phone, Trash2 } from 'lucide-react'
import { BrandMark, WantItIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'
import PlaceActions from '@/app/components/PlaceActions'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'
import { formatOptionalFoodPrice } from '@/lib/food'

interface SavedItem {
  id: string
  content_kind: 'official' | 'community'
  dish: {
    id: string
    name: string
    description: string
    photo_url: string
    price: number | null
    category?: string
    seller: {
      id: string
      business_name: string
      location_text?: string
      phone?: string
      hours_text?: string
      pickup_available?: boolean
      delivery_available?: boolean
      ordering_method?: string
      ordering_url?: string
      address?: string
      city?: string
      state?: string
      latitude?: number
      longitude?: number
      website?: string
      order_url?: string
    }
  }
}

export default function SavedPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/auth?next=/saved')
      return
    }
    loadSaved()
  }, [authLoading, user?.id, router])

  const loadSaved = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/saves')
      const data = await res.json()
      setSaved(data.saved || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const removeSaved = async (dishId: string, contentKind: SavedItem['content_kind']) => {
    await authFetch(`/api/saves?contentKind=${contentKind}&contentId=${encodeURIComponent(dishId)}`, { method: 'DELETE' })
    loadSaved()
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-20">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="font-bold text-lg text-[#1A1A2E]">Saved Food</span>
          </div>
          <Link href="/swipe" className="inline-flex min-h-11 items-center gap-1 text-[#FF5722] font-semibold text-sm">
            <ArrowLeft size={17} aria-hidden="true" /> Swipe More
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : saved.length === 0 ? (
          <div className="text-center py-16">
            <WantItIcon size={48} className="mx-auto text-[#FF5722] mb-4" />
            <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">No saved dishes yet</h2>
            <p className="text-gray-600 mb-6">Swipe right on food you like.</p>
            <Link href="/swipe" className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold">
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {saved.map((item) => {
              const dish = item.dish
              const seller = dish.seller
              const displayPrice = formatOptionalFoodPrice(dish.price)
              return (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <img src={dish.photo_url || '/placeholder-dish.png'} alt={dish.name} className="w-full h-56 object-cover" />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-[#1A1A2E]">{dish.name}</h3>
                        <p className="text-sm text-gray-600">{seller.business_name}</p>
                        <p className="mt-1 text-xs font-semibold text-sky-600">{item.content_kind === 'official' ? 'Official dish' : 'Community post'}</p>
                      </div>
                      {displayPrice && <p className="text-lg font-bold text-[#FF5722]">{displayPrice}</p>}
                    </div>

                    {dish.description && <p className="text-sm text-gray-600 mt-2">{dish.description}</p>}

                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      {seller.location_text && <div className="flex items-center gap-1"><MapPin size={14} className="text-[#FF5722]" /> {seller.location_text}</div>}
                      {seller.hours_text && <div className="flex items-center gap-1"><Clock3 size={14} className="text-[#FF5722]" aria-hidden="true" /> {seller.hours_text}</div>}
                      {seller.phone && <div className="flex items-center gap-1"><Phone size={14} className="text-[#FF5722]" /> {seller.phone}</div>}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-white">
                      <div className="flex-1"><PlaceActions place={{ ...seller, name: seller.business_name, order_url: seller.order_url || seller.ordering_url }} compact /></div>
                      <IconButton
                        label={`Remove ${dish.name} from saved dishes`}
                        onClick={() => removeSaved(dish.id, item.content_kind)}
                        className="rounded-xl bg-gray-100 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
