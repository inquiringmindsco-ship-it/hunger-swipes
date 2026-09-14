import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', vendors: [] }, { status: 503 })
  const { data, error } = await admin.from('sellers').select('id,business_name,description,logo_url,location_text,seller_type,latitude,longitude,verification_status').eq('status', 'active').order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message, vendors: [] }, { status: 500 })
  return NextResponse.json({ vendors: (data || []).map((seller: any) => ({ ...seller, name: seller.business_name, image_url: seller.logo_url, cuisine_type: seller.seller_type, active: true, verified: seller.verification_status === 'verified' })) })
}

export async function POST() {
  return NextResponse.json({ error: 'Create authenticated seller listings through /api/sellers' }, { status: 405, headers: { Allow: 'GET' } })
}
