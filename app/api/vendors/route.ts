import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured', vendors: [] }, { status: 503 })

  const { data, error } = await admin
    .from('sellers')
    .select(`
      id, business_name, description, logo_url, location_text, seller_type, seller_types,
      pickup_available, delivery_available, verification_status,
      dishes!inner(id,name,photo_url,price,category,status,availability)
    `)
    .eq('status', 'active')
    .eq('verification_status', 'approved')
    .eq('dishes.status', 'active')
    .eq('dishes.availability', 'available')
    .not('dishes.photo_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message, vendors: [] }, { status: 500 })

  const vendors = (data || []).map((seller: any) => {
    const dishes = (seller.dishes || []).filter((dish: any) => dish.photo_url)
    if (!dishes.length) return null
    return {
      id: seller.id,
      name: seller.business_name,
      description: seller.description || '',
      location: seller.location_text || '',
      sellerType: seller.seller_type || 'other',
      sellerTypes: seller.seller_types || [],
      logoUrl: seller.logo_url || '',
      coverUrl: dishes[0].photo_url,
      pickupAvailable: Boolean(seller.pickup_available),
      deliveryAvailable: Boolean(seller.delivery_available),
      approved: seller.verification_status === 'approved',
      dishes: dishes.slice(0, 4).map((dish: any) => ({
        id: dish.id, name: dish.name, photoUrl: dish.photo_url,
        price: Number(dish.price || 0), category: dish.category || '',
      })),
    }
  }).filter(Boolean)

  return NextResponse.json({ vendors })
}

export async function POST() {
  return NextResponse.json({ error: 'Create authenticated seller listings through /api/sellers' }, { status: 405, headers: { Allow: 'GET' } })
}
