'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Utensils,
  Heart,
  Eye,
  MousePointer,
  CheckCircle,
  Sparkles,
  Plus,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { BrandMark } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { useAuth } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'

const MEAL_GOAL_CENTS = 2000

interface WalletData {
  user_id: string
  balance_cents: number
  lifetime_earned_cents: number
  lifetime_redeemed_cents: number
  pending_cents: number
  available_to_redeem_cents: number
  held_cents: number
  restricted_cents: number
  redemption_status: string
  risk_flags: string[]
}

interface LedgerEntry {
  id: string
  amount_cents: number
  type: 'credit' | 'debit' | 'reversal'
  status: string
  event_type: string
  reason: string
  created_at: string
  post?: {
    id: string
    dish_name?: string
    place?: {
      id: string
      name?: string
    }
  } | null
}

interface Impact {
  dishes_posted: number
  people_reached: number
  right_swipes_generated: number
  saves_generated: number
  clicks_generated: number
  verified_meals_generated: number
  swipe_bucks_earned_cents: number
  redemption_eligible: boolean
  redemption_reasons: string[]
}

export default function SwipeBucksPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [impact, setImpact] = useState<Impact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (e) {
      console.error(e)
      setError('Couldn\'t load Swipe Bucks.')
    }
    setLoading(false)
  }

  const formatDollars = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-hs-ink pb-32">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Swipe Bucks</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-10">
          <LoadingState label="Loading your Swipe Bucks…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) return null

  const balance = wallet?.balance_cents || 0
  const progress = Math.min(balance / MEAL_GOAL_CENTS, 1)
  const isEmpty = balance === 0 && ledger.length === 0
  const latestCredit = ledger.find(e => e.type === 'credit')

  return (
    <div className="min-h-screen bg-hs-ink pb-32">
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

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="rounded-2xl border border-hs-red/30 bg-hs-red/10 p-4">
            <p className="text-sm text-hs-red font-medium">{error}</p>
          </div>
        )}

        {/* Premium Wallet Card */}
        <section className="relative">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[#141414] p-6 sm:p-7 shadow-2xl shadow-black/60 border border-[#D4AF37]/30">
            {/* metallic sheen */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.15] via-transparent to-[#D4AF37]/[0.08] pointer-events-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                    <Wallet size={16} className="text-hs-black" />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-hs-gold">Swipe Bucks</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-hs-gray">
                  <span className="w-1.5 h-1.5 rounded-full bg-hs-success animate-pulse-soft" />
                  Live
                </div>
              </div>

              <p className="text-xs text-hs-gray mb-1">Current balance</p>
              <h1 className={`text-6xl sm:text-7xl font-black tracking-tight mb-3 transition-colors ${balance === 0 ? 'text-hs-gray' : 'text-hs-cream'}`}>
                {formatDollars(balance)}
              </h1>
              <p className="text-sm text-hs-gray">Post food. Help people discover it. Earn meals.</p>

              {(wallet?.restricted_cents || 0) > 0 && (
                <p className="mt-3 text-xs text-hs-red bg-hs-red/10 border border-hs-red/20 rounded-lg px-3 py-2">
                  ${formatDollars(wallet?.restricted_cents || 0)} is currently held from redemption. Contact support if you believe this is an error.
                </p>
              )}

              {(wallet?.redemption_status === 'eligible' || wallet?.redemption_status === 'review') && !impact?.redemption_eligible && (
                <p className="mt-3 text-xs text-hs-gold bg-hs-gold/10 border border-hs-gold/20 rounded-lg px-3 py-2">
                  Swipe Bucks redemption is not open yet. Keep earning — your balance is safe.
                </p>
              )}

              {latestCredit && latestCredit.amount_cents > 0 && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-hs-gold/10 border border-hs-gold/20 px-3 py-1.5">
                  <Sparkles size={14} className="text-hs-gold" />
                  <span className="text-xs text-hs-cream">
                    Latest: +{formatDollars(latestCredit.amount_cents)} {earningLabel(latestCredit)}
                  </span>
                </div>
              )}
            </div>

            {/* subtle metallic corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/20 to-transparent rounded-bl-full pointer-events-none" />
          </div>
        </section>

        {/* Next Meal Progress */}
        <section>
          <div className="flex items-end justify-between mb-3 gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-hs-gold mb-0.5">Next Meal</p>
              <p className="text-sm text-hs-gray">Keep posting. Your next meal could be on us.</p>
            </div>
            <p className="text-lg font-bold text-hs-cream whitespace-nowrap">
              {formatDollars(balance)} <span className="text-hs-gray font-normal">/ {formatDollars(MEAL_GOAL_CENTS)}</span>
            </p>
          </div>
          <div className="h-4 w-full rounded-full bg-hs-charcoal border border-white/[0.06] overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C547] transition-all duration-700 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </section>

        {/* Lifetime stats */}
        <section className="flex items-stretch gap-3">
          <MiniStat label="Lifetime earned" value={formatDollars(wallet?.lifetime_earned_cents || 0)} isZero={(wallet?.lifetime_earned_cents || 0) === 0} />
          <MiniStat label="Pending" value={formatDollars(wallet?.pending_cents || 0)} isZero={(wallet?.pending_cents || 0) === 0} />
          <MiniStat label="Redeemed" value={formatDollars(wallet?.lifetime_redeemed_cents || 0)} isZero={(wallet?.lifetime_redeemed_cents || 0) === 0} />
        </section>

        {/* Your Food Impact */}
        {impact && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-hs-gold" size={18} />
              <h2 className="text-base font-bold text-hs-cream tracking-tight">Your Food Impact</h2>
            </div>

            <div className="rounded-[1.5rem] border border-white/[0.06] bg-gradient-to-b from-hs-charcoal to-hs-ink p-5">
              <p className="text-lg font-semibold text-hs-cream leading-snug mb-4">
                {impact.people_reached > 0
                  ? `Your food has reached ${impact.people_reached.toLocaleString()} hungry ${impact.people_reached === 1 ? 'person' : 'people'}.`
                  : 'Your food is helping people discover what to eat next.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <ImpactRow icon={<Utensils size={15} />} label="Dishes posted" value={impact.dishes_posted} />
                <ImpactRow icon={<Heart size={15} />} label="Right swipes" value={impact.right_swipes_generated} />
                <ImpactRow icon={<CheckCircle size={15} />} label="Saves" value={impact.saves_generated} />
                <ImpactRow icon={<Wallet size={15} />} label="Swipe Bucks earned" value={formatDollars(impact.swipe_bucks_earned_cents)} />
                {impact.clicks_generated > 0 && <ImpactRow icon={<MousePointer size={15} />} label="Order clicks" value={impact.clicks_generated} />}
                {impact.verified_meals_generated > 0 && <ImpactRow icon={<Utensils size={15} />} label="Verified meals" value={impact.verified_meals_generated} />}
              </div>
            </div>
          </section>
        )}

        {/* Recent Earnings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-hs-gold" size={18} />
              <h2 className="text-base font-bold text-hs-cream tracking-tight">Recent Earnings</h2>
            </div>
          </div>

          {ledger.length === 0 ? (
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-hs-charcoal p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-hs-soft flex items-center justify-center mx-auto mb-4">
                <Wallet size={24} className="text-hs-gold" />
              </div>
              <p className="text-lg font-bold text-hs-cream mb-1">No Swipe Bucks yet.</p>
              <p className="text-sm text-hs-gray mb-5">Post a dish and help someone find their next meal.</p>
              <Link
                href="/post"
                className="inline-flex items-center gap-2 px-5 py-3 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
              >
                <Plus size={16} /> {(impact?.dishes_posted || 0) > 0 ? 'Post another dish' : 'Post your first dish'}
              </Link>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-hs-charcoal overflow-hidden">
              {ledger.slice(0, 20).map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`flex items-start justify-between px-5 py-4 ${idx !== 0 ? 'border-t border-white/[0.04]' : ''}`}
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-semibold text-hs-cream">{earningLabel(entry)}</p>
                    {entry.post && (entry.post.dish_name || entry.post.place?.name) && (
                      <p className="text-xs text-hs-gray mt-0.5">
                        {entry.post.place?.name}
                        {entry.post.dish_name && entry.post.place?.name ? ' • ' : ''}
                        {entry.post.dish_name}
                      </p>
                    )}
                    <p className="text-[11px] text-hs-muted mt-1.5">{formatDate(entry.created_at)}</p>
                    {entry.status === 'pending' && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-hs-gold">Pending</span>
                    )}
                  </div>
                  <span className={`text-base font-bold shrink-0 ${entry.type === 'credit' ? 'text-hs-cream' : entry.type === 'debit' ? 'text-hs-gold' : 'text-hs-red'}`}>
                    {entry.type === 'credit' ? '+' : '-'}{formatDollars(Math.abs(entry.amount_cents))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Post CTA when populated */}
        {!isEmpty && (
          <Link
            href="/post"
            className="group flex items-center justify-between w-full px-5 py-4 bg-hs-gold text-hs-black rounded-2xl font-bold hover:bg-hs-gold-light transition"
          >
            <span className="flex items-center gap-2">
              <Plus size={18} /> Post another dish
            </span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
          </Link>
        )}

        {/* bottom spacing for nav */}
        <div className="h-6" />
      </main>
      <MobileNav />
    </div>
  )
}

function MiniStat({ label, value, isZero }: { label: string; value: string; isZero?: boolean }) {
  return (
    <div className="flex-1 rounded-2xl border border-white/[0.06] bg-hs-charcoal px-3 py-3.5 text-center">
      <p className={`text-lg font-bold ${isZero ? 'text-hs-gray' : 'text-hs-cream'}`}>{value}</p>
      <p className="text-[10px] text-hs-gray uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

function ImpactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-hs-soft text-hs-gold flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-base font-bold text-hs-cream">{value}</p>
        <p className="text-[11px] text-hs-gray uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}

function earningLabel(entry: LedgerEntry): string {
  switch (entry.event_type) {
    case 'right_swipe':
      return 'Someone swiped right on your dish'
    case 'save':
      return 'Someone saved your dish'
    case 'first_photo':
      return 'First photo bonus'
    case 'manual_credit':
      return entry.reason || 'Manual credit'
    case 'manual_reversal':
      return entry.reason || 'Manual reversal'
    case 'redemption':
      return 'Redeemed'
    default:
      return entry.reason || entry.event_type.replace(/_/g, ' ')
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
