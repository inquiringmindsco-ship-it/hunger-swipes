import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seller_id, event_type, metadata } = body
    if (!seller_id || !event_type) {
      return NextResponse.json({ error: 'seller_id and event_type required' }, { status: 400 })
    }
    if (!['scan', 'signup', 'seller_created'].includes(event_type)) {
      return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { error } = await admin.from('seller_referrals').insert({
      seller_id,
      event_type,
      metadata: metadata || {},
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
