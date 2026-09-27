import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RestaurantClient, { Restaurant, Dish } from './RestaurantClient'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const PUBLIC_FIELDS = 'id,slug,business_name,tagline,description,logo_url,hero_url,location_text,address,phone,hours_text,ordering_method,ordering_url,website_url,pickup_available,delivery_available,status,verification_status'

interface Props {
  params: Promise<{ slug: string }>
}

async function fetchRestaurant(slug: string): Promise<{ restaurant: Restaurant; dishes: Dish[] } | null> {
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const { data: restaurant, error } = await admin.from('sellers').select(PUBLIC_FIELDS).ilike('slug', slug).maybeSingle()
  if (error || !restaurant) return null
  const { data: dishes, error: dishError } = restaurant.status === 'active'
    ? await admin.from('dishes').select('id,name,description,photo_url,price,category,tags').eq('seller_id', restaurant.id).eq('status', 'active').eq('availability', 'available').not('photo_url', 'is', null).neq('photo_url', '').order('created_at', { ascending: true })
    : { data: [], error: null }
  if (dishError) return null
  return { restaurant: restaurant as Restaurant, dishes: (dishes || []) as Dish[] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchRestaurant(slug)
  if (!data) return { title: 'Restaurant not found | Hunger Swipes' }
  const { restaurant } = data
  const title = `${restaurant.business_name} on Hunger Swipes`
  const description = restaurant.tagline || restaurant.description || `Discover ${restaurant.business_name} on Hunger Swipes — swipe through their food and order what you want.`
  return {
    title,
    description,
    metadataBase: new URL('https://hungerswipes.com'),
    alternates: { canonical: `/${restaurant.slug}` },
    openGraph: {
      type: 'website',
      url: `https://hungerswipes.com/${restaurant.slug}`,
      siteName: 'Hunger Swipes',
      title,
      description,
      images: restaurant.logo_url ? [{ url: restaurant.logo_url, alt: restaurant.business_name }] : ['/og-image.png'],
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params
  const data = await fetchRestaurant(slug)
  if (!data) notFound()
  return <RestaurantClient restaurant={data.restaurant} dishes={data.dishes} />
}
