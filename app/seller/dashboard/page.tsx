'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Ban, CheckCircle2, Clock3, ExternalLink, LogOut, MapPin, Phone, Plus, Timer, ToggleLeft, ToggleRight } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { getSupabase } from '@/lib/supabase'
import { BrandMark, SellerTypeIcon } from '@/app/components/icons/HungerIcons'
import { IconButton } from '@/app/components/ui/IconButton'
import MobileNav from '@/app/components/MobileNav'

function DashboardContent() {
  const params = useSearchParams()
  const router = useRouter()
  const sellerId = params.get('id')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

  const [seller, setSeller] = useState<any>(null)
  const [dishes, setDishes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [sellerId])

  const loadData = async () => {
    setLoading(true)
    try {
      const sellerRes = await authFetch(sellerId ? `/api/sellers?id=${sellerId}` : '/api/sellers?mine=true')
      const sellerData = await sellerRes.json()
      if (sellerRes.status === 401) {
        router.replace('/auth?next=%2Fseller%2Fdashboard')
        return
      }
      if (!sellerData.seller) {
        setSeller(null)
        return
      }
      const ownedSellerId = sellerData.seller.id
      const [dishesRes, statsRes] = await Promise.all([
        authFetch(`/api/sellers/${ownedSellerId}/dishes`),
        authFetch(`/api/sellers/${ownedSellerId}/stats`),
      ])
      const dishesData = await dishesRes.json()
      const statsData = await statsRes.json()
      setSeller(sellerData.seller)
      if (dishesData.dishes) setDishes(dishesData.dishes)
      if (statsData.stats) setStats(statsData.stats)
    } catch {
      router.replace('/auth?next=%2Fseller%2Fdashboard')
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (dish: any) => {
    const next = dish.availability === 'available' ? 'unavailable' : 'available'
    await authFetch(`/api/dishes?id=${dish.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: next }),
    })
    loadData()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!seller) return <div className="min-h-screen flex items-center justify-center">No seller profile found. <Link href="/join" className="ml-2 text-[#FF5722]">Create one</Link></div>

  const joinUrl = `${appUrl}/join`

  const logout = async () => {
    await getSupabase()?.auth.signOut()
    localStorage.removeItem('hungerswipes_user')
    router.replace('/auth?next=%2Fseller%2Fdashboard')
  }

  const StatusIcon = seller.status === 'active' ? CheckCircle2 : seller.status === 'suspended' ? Ban : Timer

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-24">
      <header className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-bold text-sm">Seller Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/swipe" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <ExternalLink size={14} /> Preview
          </Link>
          <button onClick={logout} className="inline-flex min-h-11 items-center gap-1.5 text-xs text-gray-400 hover:text-white">
            <LogOut size={15} aria-hidden="true" /> Log out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Status */}
        <div className={`rounded-2xl p-4 flex items-center justify-between border ${
          seller.status === 'active' ? 'bg-[#10B981]/10 border-[#10B981]/20' : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div>
            <p className="text-sm font-semibold capitalize inline-flex items-center gap-2">
              <StatusIcon size={18} aria-hidden="true" /> {seller.status.replace('_', ' ')}
            </p>
            {seller.seller_type === 'home_kitchen' && seller.verification_status !== 'approved' && (
              <p className="text-xs text-amber-400 mt-0.5">Home kitchen pending verification</p>
            )}
          </div>
        </div>

        {/* Seller card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black inline-flex items-center gap-2"><SellerTypeIcon type={seller.seller_type} size={24} className="text-[#FF5722]" /> {seller.business_name}</h1>
              <p className="text-sm text-gray-400 capitalize mt-1">{seller.seller_type.replace('_', ' ')}</p>
              {seller.description && <p className="text-sm text-gray-400 mt-2">{seller.description}</p>}
            </div>
            {seller.logo_url && <img src={seller.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />}
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-400">
            {seller.location_text && <div className="flex items-center gap-2"><MapPin size={14} className="text-[#FF5722]" /> {seller.location_text}</div>}
            {seller.hours_text && <div className="flex items-center gap-2"><Clock3 size={14} className="text-[#FF5722]" aria-hidden="true" /> {seller.hours_text}</div>}
            {seller.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-[#FF5722]" /> {seller.phone}</div>}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
            <h2 className="font-bold mb-3">Performance</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white/[0.02] rounded-xl">
                <div className="text-xl font-black">{stats.impressions}</div>
                <div className="text-xs text-gray-400">Views</div>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl">
                <div className="text-xl font-black text-[#10B981]">{stats.rightSwipes}</div>
                <div className="text-xs text-gray-400">Likes</div>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl">
                <div className="text-xl font-black">{stats.rightSwipeRate}%</div>
                <div className="text-xs text-gray-400">Like Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Dishes */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Your Dishes</h2>
            <Link
              href="/seller/dishes/new"
              className="px-3 py-2 bg-[#FF5722] text-white rounded-xl text-sm font-bold flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </Link>
          </div>

          {dishes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No dishes yet.</p>
              <Link href="/seller/dishes/new" className="text-[#FF5722] font-semibold">
                Add your first dish
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dishes.map((dish: any) => (
                <div key={dish.id} className="bg-white/[0.02] rounded-xl p-3 flex items-center gap-3">
                  <img
                    src={dish.photo_url || '/placeholder-dish.png'}
                    alt={dish.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{dish.name}</p>
                    <p className="text-sm text-[#FF5722] font-semibold">${Number(dish.price).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{dish.availability === 'available' ? 'Available' : 'Unavailable'}</p>
                  </div>
                  <IconButton
                    label={`${dish.availability === 'available' ? 'Mark unavailable' : 'Mark available'}: ${dish.name}`}
                    onClick={() => toggleAvailability(dish)}
                    className="rounded-xl text-3xl"
                  >
                    {dish.availability === 'available' ? (
                      <ToggleRight size={36} className="text-[#10B981]" />
                    ) : (
                      <ToggleLeft size={36} className="text-gray-500" />
                    )}
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center">
          <h2 className="font-bold mb-3">Your Join QR</h2>
          <div className="bg-white p-3 rounded-xl inline-block">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
          <p className="text-xs text-gray-500 mt-3 break-all">{joinUrl}</p>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
