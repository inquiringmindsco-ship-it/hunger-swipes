import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seller_id, event_type, metadata } = body
    if (!seller_id || !event_type) {
      return NextResponse.json({ error: 'seller_id and event_type required' }, { status: 400 })
    }
    if (!['scan', 'signup'].includes(event_type)) {
      return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: seller } = await admin.from('sellers').select('id').eq('id', seller_id).maybeSingle()
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    let actorId: string | null = null
    if (event_type === 'signup') {
      const user = await getRequestUser(request)
      if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      actorId = user.id
      const { data: existing } = await admin.from('seller_referrals').select('id').eq('seller_id', seller_id).eq('event_type', 'signup').contains('metadata', { actor_id: actorId }).maybeSingle()
      if (existing) return NextResponse.json({ success: true, duplicate: true })
    }

    const { error } = await admin.from('seller_referrals').insert({
      seller_id,
      event_type,
      metadata: { ...(metadata || {}), ...(actorId ? { actor_id: actorId } : {}) },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
