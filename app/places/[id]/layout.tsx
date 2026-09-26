import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface PlaceRow {
  id: string
  name: string
  place_type?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
  cuisine?: string | null
  address?: string | null
  location_text?: string | null
  phone?: string | null
  website?: string | null
  operational_status?: string | null
}

function schemaTypeForPlace(placeType?: string | null, category?: string | null): string {
  const t = (placeType || '').toLowerCase()
  const c = (category || '').toLowerCase()
  if (t === 'fast_food' || c.includes('fast food')) return 'FastFoodRestaurant'
  if (t === 'cafe' || c.includes('cafe')) return 'CafeOrCoffeeShop'
  if (t === 'bakery' || c.includes('bakery')) return 'Bakery'
  if (t === 'ice_cream' || c.includes('ice cream')) return 'IceCreamShop'
  if (t === 'restaurant' || c.includes('restaurant')) return 'Restaurant'
  if (t === 'caterer') return 'CateringService'
  if (t === 'food_truck' || t === 'home_kitchen' || t === 'pop_up' || t === 'meal_prep' || t === 'other' || t === 'food_court' || t === 'deli' || t === 'confectionery' || t === 'pastry') return 'FoodEstablishment'
  return 'FoodEstablishment'
}

async function fetchPublicPlace(id: string): Promise<PlaceRow | null> {
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const { data, error } = await admin
    .from('places')
    .select('id,name,place_type,city,state,category,cuisine,address,location_text,phone,website,operational_status')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) return null
  const place = data as PlaceRow
  // Only publicly visible if active and not marked closed
  if (place.operational_status === 'closed' || place.operational_status === 'removed') return null
  return place
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const place = await fetchPublicPlace(id)
  const canonical = `https://hungerswipes.com/places/${encodeURIComponent(id)}`

  if (!place) {
    return {
      title: 'Place not found — Hunger Swipes',
      description: 'This food place is not available on Hunger Swipes.',
      alternates: { canonical },
      robots: { index: false, follow: false },
    }
  }

  const title = `${place.name} — Food place on Hunger Swipes`
  const description = `View ${place.name}${place.city ? ` in ${place.city}` : ''} on Hunger Swipes. Find dishes, location, and ordering options for this real food place.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'Hunger Swipes',
      title,
      description,
      images: ['/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function PlaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const place = await fetchPublicPlace(id)

  if (!place) {
    return children
  }

  const schemaType = schemaTypeForPlace(place.place_type, place.category)
  const structuredData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: place.name,
    url: `https://hungerswipes.com/places/${encodeURIComponent(id)}`,
    '@id': `https://hungerswipes.com/places/${encodeURIComponent(id)}`,
  }
  if (place.address || place.location_text) {
    structuredData.address = place.address || place.location_text
  }
  if (place.phone) structuredData.telephone = place.phone
  if (place.website) structuredData.sameAs = [place.website]
  if (place.city) {
    structuredData.areaServed = { '@type': 'City', name: place.city }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {children}
    </>
  )
}
