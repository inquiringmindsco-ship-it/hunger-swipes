'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, MapPin, Phone, Clock, ExternalLink, Trash2, ChefHat } from 'lucide-react'

interface SavedItem {
  id: string
  dish: {
    id: string
    name: string
    description: string
    photo_url: string
    price: number
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
    }
  }
}

function getEaterId(): string {
  if (typeof window === 'undefined') return 'demo-eater'
  let id = localStorage.getItem('hs_eater_id')
  if (!id) {
    id = 'eater-' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('hs_eater_id', id)
  }
  return id
}

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSaved()
  }, [])

  const loadSaved = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/saves?eaterId=${getEaterId()}`)
      const data = await res.json()
      setSaved(data.saved || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const removeSaved = async (dishId: string) => {
    await fetch(`/api/saves?eaterId=${getEaterId()}&dishId=${dishId}`, { method: 'DELETE' })
    loadSaved()
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF5722] rounded-lg flex items-center justify-center font-black text-white text-xs">HS</div>
            <span className="font-bold text-lg text-[#1A1A2E]">Saved Food</span>
          </div>
          <Link href="/swipe" className="text-[#FF5722] font-semibold text-sm">
            ← Swipe More
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : saved.length === 0 ? (
          <div className="text-center py-16">
            <ChefHat size={48} className="mx-auto text-[#FF5722] mb-4" />
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
              return (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <img src={dish.photo_url || '/placeholder-dish.png'} alt={dish.name} className="w-full h-56 object-cover" />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-[#1A1A2E]">{dish.name}</h3>
                        <p className="text-sm text-gray-600">{seller.business_name}</p>
                      </div>
                      <p className="text-lg font-bold text-[#FF5722]">${Number(dish.price).toFixed(2)}</p>
                    </div>

                    {dish.description && <p className="text-sm text-gray-600 mt-2">{dish.description}</p>}

                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      {seller.location_text && <div className="flex items-center gap-1"><MapPin size={14} className="text-[#FF5722]" /> {seller.location_text}</div>}
                      {seller.hours_text && <div className="flex items-center gap-1"><Clock size={14} className="text-[#FF5722]" /> {seller.hours_text}</div>}
                      {seller.phone && <div className="flex items-center gap-1"><Phone size={14} className="text-[#FF5722]" /> {seller.phone}</div>}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {seller.ordering_url ? (
                        <a
                          href={seller.ordering_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-3 bg-[#FF5722] text-white rounded-xl font-bold text-center flex items-center justify-center gap-1"
                        >
                          <ExternalLink size={16} /> Order
                        </a>
                      ) : seller.phone ? (
                        <a
                          href={`tel:${seller.phone}`}
                          className="flex-1 py-3 bg-[#FF5722] text-white rounded-xl font-bold text-center flex items-center justify-center gap-1"
                        >
                          <Phone size={16} /> Call
                        </a>
                      ) : (
                        <div className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-semibold text-center">
                          Contact seller in person
                        </div>
                      )}
                      <button
                        onClick={() => removeSaved(dish.id)}
                        className="px-3 py-3 bg-gray-100 rounded-xl text-gray-500 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
