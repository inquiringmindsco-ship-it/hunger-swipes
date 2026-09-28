'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, TrendingUp, Utensils, Heart, Eye, MousePointer, CheckCircle, Sparkles } from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'

interface WalletData {
  balance_cents: number
  lifetime_earned_cents: number
  lifetime_redeemed_cents: number
  pending_cents: number
}

interface LedgerEntry {
  id: string
  amount_cents: number
  type: 'credit' | 'debit' | 'reversal'
  event_type: string
  reason: string
  created_at: string
}

interface Impact {
  dishes_posted: number
  people_reached: number
  right_swipes_generated: number
  saves_generated: number
  clicks_generated: number
  verified_meals_generated: number
  swipe_bucks_earned_cents: number
}

export default function SwipeBucksPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [impact, setImpact] = useState<Impact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentReward, setRecentReward] = useState<LedgerEntry | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/auth?next=/swipe-bucks')
      return
    }
    loadData()
  }, [authLoading, user?.id, router])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/swipe-bucks')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Swipe Bucks unavailable')
      setWallet(data.wallet)
      setLedger(data.ledger || [])
      setImpact(data.impact)

      const recent = (data.ledger || []).find((e: LedgerEntry) => e.type === 'credit')
      if (recent) setRecentReward(recent)
    } catch (e) {
      console.error(e)
      setError('Couldn’t load Swipe Bucks.')
    }
    setLoading(false)
  }

  const formatDollars = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Swipe Bucks</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your Swipe Bucks…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-hs-ink pb-24">
      <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Swipe Bucks</span>
          </div>
          <Link href="/account" className="flex items-center gap-1 text-hs-gold text-sm font-semibold hover:text-hs-gold-light transition">
            <ArrowLeft size={16} /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        {/* Hero card */}
        <section className="relative overflow-hidden rounded-[2rem] border border-hs-gold/20 bg-gradient-to-br from-hs-gold/20 to-hs-charcoal p-6">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-1">Swipe Bucks Balance</p>
            <h1 className="text-5xl font-black text-hs-cream">{formatDollars(wallet?.balance_cents || 0)}</h1>
            <p className="text-sm text-hs-gray mt-2">Post food. Help people discover it. Earn meals.</p>
          </div>
          <Wallet className="absolute right-4 bottom-4 text-hs-gold/10" size={120} />
        </section>

        {/* Reward moment */}
        {recentReward && recentReward.amount_cents > 0 && (
          <section className="rounded-2xl border border-hs-gold/20 bg-hs-gold/10 p-4 flex items-start gap-3">
            <Sparkles className="text-hs-gold shrink-0" size={24} />
            <div>
              <p className="font-bold text-hs-cream">You earned Swipe Bucks 🍽</p>
              <p className="text-sm text-hs-gray">{recentReward.reason || 'Someone discovered food through your post.'} <span className="text-hs-gold font-bold">+{formatDollars(recentReward.amount_cents)}</span></p>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-hs-gray uppercase tracking-wider">Lifetime earned</p>
            <p className="text-xl font-bold text-hs-cream">{formatDollars(wallet?.lifetime_earned_cents || 0)}</p>
          </div>
          <div className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-hs-gray uppercase tracking-wider">Redeemed</p>
            <p className="text-xl font-bold text-hs-cream">{formatDollars(wallet?.lifetime_redeemed_cents || 0)}</p>
          </div>
          <div className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-hs-gray uppercase tracking-wider">Pending</p>
            <p className="text-xl font-bold text-hs-cream">{formatDollars(wallet?.pending_cents || 0)}</p>
          </div>
          <div className="bg-hs-charcoal border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-hs-gray uppercase tracking-wider">Next meal</p>
            <p className="text-sm text-hs-gray">Redemption coming soon</p>
          </div>
        </section>

        {/* Food Impact */}
        {impact && (
          <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-hs-gold" size={20} />
              <h2 className="text-lg font-bold text-hs-cream">Your Food Impact</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ImpactRow icon={<Utensils size={16} />} label="Dishes posted" value={impact.dishes_posted} />
              <ImpactRow icon={<Eye size={16} />} label="People reached" value={impact.people_reached} />
              <ImpactRow icon={<Heart size={16} />} label="Right swipes" value={impact.right_swipes_generated} />
              <ImpactRow icon={<CheckCircle size={16} />} label="Saves" value={impact.saves_generated} />
              {impact.clicks_generated > 0 && <ImpactRow icon={<MousePointer size={16} />} label="Order clicks" value={impact.clicks_generated} />}
              {impact.verified_meals_generated > 0 && <ImpactRow icon={<Utensils size={16} />} label="Verified meals" value={impact.verified_meals_generated} />}
              <ImpactRow icon={<Wallet size={16} />} label="Swipe Bucks earned" value={formatDollars(impact.swipe_bucks_earned_cents)} />
            </div>
          </section>
        )}

        {/* Recent activity */}
        <section className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] p-5">
          <h2 className="text-lg font-bold text-hs-cream mb-4">Recent Activity</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-hs-gray">No Swipe Bucks activity yet. Start posting food to earn.</p>
          ) : (
            <div className="space-y-3">
              {ledger.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-hs-cream truncate">{entry.reason || entry.event_type}</p>
                    <p className="text-xs text-hs-gray">{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${entry.type === 'credit' ? 'text-hs-success' : entry.type === 'debit' ? 'text-hs-gold' : 'text-hs-red'}`}>
                    {entry.type === 'credit' ? '+' : '-'}{formatDollars(Math.abs(entry.amount_cents))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <Link
          href="/post"
          className="block w-full py-4 bg-hs-gold text-hs-black rounded-2xl font-bold text-center hover:bg-hs-gold-light transition"
        >
          Post Food to Earn
        </Link>
      </main>
      <MobileNav />
    </div>
  )
}

function ImpactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-hs-soft text-hs-gold flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-lg font-bold text-hs-cream">{value}</p>
        <p className="text-[11px] text-hs-gray uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}
