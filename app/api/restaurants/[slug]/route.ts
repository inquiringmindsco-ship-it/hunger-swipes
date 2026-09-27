import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeRestaurantSlug } from '@/lib/restaurant-slug'

const PUBLIC_FIELDS = 'id,slug,business_name,tagline,description,logo_url,hero_url,location_text,address,phone,hours_text,pickup_available,delivery_available,ordering_method,ordering_url,website_url,status,verification_status'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = normalizeRestaurantSlug(rawSlug)
  if (!slug) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data: restaurant, error } = await admin
    .from('sellers')
    .select(PUBLIC_FIELDS)
    .ilike('slug', slug)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const { data: dishes, error: dishesError } = restaurant.status === 'active'
    ? await admin
      .from('dishes')
      .select('id,name,description,photo_url,price,category,tags,availability,status')
      .eq('seller_id', restaurant.id)
      .eq('status', 'active')
      .eq('availability', 'available')
      .not('photo_url', 'is', null)
      .neq('photo_url', '')
      .order('created_at', { ascending: true })
    : { data: [], error: null }

  if (dishesError) return NextResponse.json({ error: dishesError.message }, { status: 500 })
  return NextResponse.json({ restaurant, dishes: dishes || [] })
}
