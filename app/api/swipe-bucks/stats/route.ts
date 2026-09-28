import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  return secret === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { data: outstanding },
      { data: today },
      { data: month },
      { data: byStatus },
      { data: credits },
    ] = await Promise.all([
      admin.from('swipe_bucks_wallets').select('balance_cents'),
      admin.from('swipe_bucks_ledger').select('amount_cents, type').gte('created_at', todayStart).eq('status', 'credited'),
      admin.from('swipe_bucks_ledger').select('amount_cents, type').gte('created_at', monthStart).eq('status', 'credited'),
      admin.from('swipe_bucks_ledger').select('status, type, amount_cents'),
      admin.from('swipe_bucks_ledger').select('user_id, post_id, amount_cents').eq('type', 'credit').eq('status', 'credited').gte('created_at', todayStart),
    ])

    const sumCents = (rows: any[] | null, filter?: (r: any) => boolean) =>
      (rows || []).filter(filter || (() => true)).reduce((s, r) => s + (r.amount_cents || 0), 0)

    const statusTotals: Record<string, { credits: number; debits: number }> = {}
    for (const row of byStatus || []) {
      if (!statusTotals[row.status]) statusTotals[row.status] = { credits: 0, debits: 0 }
      if (row.type === 'credit') statusTotals[row.status].credits += row.amount_cents
      else statusTotals[row.status].debits += row.amount_cents
    }

    const userTotals: Record<string, number> = {}
    const postTotals: Record<string, number> = {}
    const userCounts: Record<string, number> = {}
    for (const row of credits || []) {
      if (row.user_id) {
        userTotals[row.user_id] = (userTotals[row.user_id] || 0) + (row.amount_cents || 0)
        userCounts[row.user_id] = (userCounts[row.user_id] || 0) + 1
      }
      if (row.post_id) postTotals[row.post_id] = (postTotals[row.post_id] || 0) + (row.amount_cents || 0)
    }

    const topUsers = Object.entries(userTotals)
      .map(([user_id, sum]) => ({ user_id, sum }))
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 10)

    const topPosts = Object.entries(postTotals)
      .map(([post_id, sum]) => ({ post_id, sum }))
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 10)

    const suspicious = Object.entries(userCounts)
      .filter(([_, count]) => count >= 50)
      .map(([user_id, count]) => ({ user_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    return NextResponse.json({
      outstanding_cents: (outstanding || []).reduce((s, w) => s + (w.balance_cents || 0), 0),
      issued_today_cents: sumCents(today, (r) => r.type === 'credit'),
      redeemed_today_cents: sumCents(today, (r) => r.type === 'debit'),
      issued_month_cents: sumCents(month, (r) => r.type === 'credit'),
      redeemed_month_cents: sumCents(month, (r) => r.type === 'debit'),
      status_totals: statusTotals,
      top_users: topUsers,
      top_posts: topPosts,
      suspicious: suspicious,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
