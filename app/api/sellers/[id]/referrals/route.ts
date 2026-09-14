import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { id: sellerId } = await params

    // Verify ownership
    const { data: seller, error: sellerError } = await admin
      .from('sellers')
      .select('id')
      .eq('id', sellerId)
      .eq('owner_user_id', user.id)
      .maybeSingle()

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('seller_referrals')
      .select('event_type, created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const stats = {
      scans: 0,
      signups: 0,
      sellers_created: 0,
      recent: data || [],
    }
    for (const row of data || []) {
      if (row.event_type === 'scan') stats.scans++
      if (row.event_type === 'signup') stats.signups++
      if (row.event_type === 'seller_created') stats.sellers_created++
    }

    return NextResponse.json({ stats })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
