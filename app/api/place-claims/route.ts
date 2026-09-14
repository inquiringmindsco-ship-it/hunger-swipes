import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data, error } = await admin.from('place_claims').select('*,place:places(id,name,address,location_text)').eq('claimant_user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ claims: data || [] })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.place_id) return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
  const email = typeof body.business_email === 'string' ? body.business_email.trim().slice(0, 254) : ''
  const phone = typeof body.business_phone === 'string' ? body.business_phone.trim().slice(0, 80) : ''
  const note = typeof body.evidence_note === 'string' ? body.evidence_note.trim().slice(0, 1500) : ''
  if (!email && !phone) return NextResponse.json({ error: 'Business email or phone is required for verification' }, { status: 400 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data: place } = await admin.from('places').select('id,claimed_status,claimed_seller_id').eq('id', body.place_id).eq('status', 'active').maybeSingle()
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 })
  if (place.claimed_status === 'claimed' || place.claimed_seller_id) return NextResponse.json({ error: 'This Place is already claimed' }, { status: 409 })
  const { data: existing } = await admin.from('place_claims').select('*').eq('place_id', place.id).eq('claimant_user_id', user.id).eq('status', 'pending').maybeSingle()
  if (existing) return NextResponse.json({ claim: existing })
  const { data, error } = await admin.from('place_claims').insert({ place_id: place.id, claimant_user_id: user.id, business_email: email || null, business_phone: phone || null, evidence_note: note || null, status: 'pending' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.from('places').update({ claimed_status: 'claim_pending' }).eq('id', place.id).eq('claimed_status', 'unclaimed')
  return NextResponse.json({ claim: data }, { status: 201 })
}
