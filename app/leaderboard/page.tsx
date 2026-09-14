'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, Trophy } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'

export default function LeaderboardPage() {
  const [foods, setFoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/dishes?mode=trending&limit=20').then(r => r.json()).then(data => setFoods(data.dishes || [])).finally(() => setLoading(false))
  }, [])
  return <div className="min-h-screen bg-[#0D0D0D] text-white">
    <header className="border-b border-white/10 px-4 py-5"><div className="mx-auto flex max-w-2xl items-center justify-between"><Link href="/" className="flex items-center gap-2"><BrandMark size={34} /><span className="font-black">HungerSwipes</span></Link><Link href="/post" className="text-sm font-bold text-[#FF5722]">Post food</Link></div></header>
    <main className="mx-auto max-w-2xl px-4 py-8"><h1 className="flex items-center gap-2 text-3xl font-black"><Trophy className="text-[#FFD700]" /> Trending food</h1><p className="mt-2 text-gray-400">Ranked by authenticated right swipes. No invented earnings or order totals.</p>
      {loading ? <p className="py-12 text-gray-500">Loading…</p> : foods.length === 0 ? <div className="py-16 text-center"><Flame className="mx-auto mb-3 text-[#FF5722]" size={44} /><p className="font-bold">No ranked food yet.</p><Link href="/swipe" className="mt-5 inline-block rounded-full bg-[#FF5722] px-5 py-3 font-bold">Start swiping</Link></div> : <ol className="mt-8 space-y-3">{foods.map((food, index) => <li key={`${food.content_kind}:${food.id}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3"><span className="w-8 text-center text-lg font-black text-[#FFD700]">{index + 1}</span><img src={food.photo_url} alt={food.name} className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-bold">{food.name}</p><p className="truncate text-sm text-gray-400">{food.seller?.business_name}</p><p className="mt-1 text-xs text-sky-400">{food.content_kind === 'official' ? 'Official dish' : 'Community post'}</p></div><div className="text-right"><p className="font-black text-[#FF5722]">{food.right_swipes || 0}</p><p className="text-xs text-gray-500">wants</p></div></li>)}</ol>}
    </main>
  </div>
}
