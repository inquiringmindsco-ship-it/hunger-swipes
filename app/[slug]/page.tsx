import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RestaurantClient, { Restaurant, Dish } from './RestaurantClient'
import FoodProfileClient from '@/app/components/FoodProfileClient'
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

async function fetchProfile(slug: string): Promise<any | null> {
  const normalized = slug.trim().toLowerCase().replace(/^@/, '')
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const { data: handleRow } = await admin.from('handles').select('*').eq('handle', normalized).maybeSingle()
  if (!handleRow) return null

  const isOwn = false // server-side public fetch; private counts omitted
  let profile: any = null
  let entity: any = null
  let dishes: any[] = []
  let recipes: any[] = []

  if (handleRow.owner_type === 'user') {
    const { data: p } = await admin.from('food_profiles').select('*').eq('owner_type', 'user').eq('owner_id', handleRow.owner_id).maybeSingle()
    profile = p
    entity = { id: handleRow.owner_id }
    const { data: posts } = await admin
      .from('community_food_posts')
      .select('id, dish_name, photo_url, created_at, right_swipes')
      .eq('user_id', handleRow.owner_id)
      .eq('status', 'active')
      .eq('moderation_status', 'approved')
      .eq('profile_eligible', true)
      .order('created_at', { ascending: false })
      .limit(20)
    dishes = posts || []
  } else if (handleRow.owner_type === 'seller') {
    const [{ data: p }, { data: s }] = await Promise.all([
      admin.from('food_profiles').select('*').eq('owner_type', 'seller').eq('owner_id', handleRow.owner_id).maybeSingle(),
      admin.from('sellers').select('*').eq('id', handleRow.owner_id).maybeSingle(),
    ])
    profile = p
    entity = s
    const [{ data: sd }, { data: sr }] = await Promise.all([
      admin.from('dishes').select('id, name, photo_url, price, category, tags, recipe_available, created_at').eq('seller_id', handleRow.owner_id).eq('status', 'active').order('created_at', { ascending: false }).limit(20),
      admin.from('recipes').select('id, dish_id, title, description, price, photo_url, recipe_type, published, status').eq('seller_id', handleRow.owner_id).eq('status', 'active').eq('published', true).order('created_at', { ascending: false }).limit(20),
    ])
    dishes = sd || []
    recipes = sr || []
  }

  return {
    handle: handleRow.handle,
    owner_type: handleRow.owner_type,
    profile,
    entity,
    dishes,
    recipes,
    private: { follower_count: null, following_count: null, is_following: null },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const profile = await fetchProfile(slug)
  if (profile) {
    const title = `@${profile.handle} on Hunger Swipes`
    return {
      title,
      description: profile.profile?.bio || `Discover food from @${profile.handle} on Hunger Swipes.`,
      alternates: { canonical: `/${profile.handle}` },
    }
  }
  const data = await fetchRestaurant(slug)
  if (!data) return { title: 'Not found | Hunger Swipes' }
  const { restaurant } = data
  return {
    title: `${restaurant.business_name} on Hunger Swipes`,
    description: restaurant.tagline || restaurant.description || `Discover ${restaurant.business_name} on Hunger Swipes.`,
    alternates: { canonical: `/${restaurant.slug}` },
  }
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params
  const profile = await fetchProfile(slug)
  if (profile) return <FoodProfileClient initialData={profile} />

  const data = await fetchRestaurant(slug)
  if (!data) notFound()
  return <RestaurantClient restaurant={data.restaurant} dishes={data.dishes} />
}
