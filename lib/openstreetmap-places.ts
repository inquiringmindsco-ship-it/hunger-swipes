export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright'
export const OSM_SOURCE = 'openstreetmap'

const FOOD_AMENITIES = new Set(['restaurant', 'fast_food', 'cafe', 'ice_cream', 'food_court'])
const FOOD_SHOPS = new Set(['bakery', 'confectionery', 'deli', 'seafood', 'pastry'])

export type ProviderPlace = {
  externalSource: typeof OSM_SOURCE
  externalSourceId: string
  name: string
  placeType: string
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  latitude: number
  longitude: number
  phone: string | null
  website: string | null
  orderUrl: string | null
  category: string | null
  cuisine: string | null
  hours: string | null
  operationalStatus: 'operational'
  providerMetadata: Record<string, unknown>
}

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null
}

function safeWebUrl(value: unknown) {
  const raw = clean(value, 1000)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

function addressFromTags(tags: Record<string, string>) {
  const line = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const locality = [tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ')
  return clean([line, locality].filter(Boolean).join(', '), 500)
}

export function mapOsmElement(element: any): ProviderPlace | null {
  const tags = element?.tags || {}
  const amenity = clean(tags.amenity, 80)
  const shop = clean(tags.shop, 80)
  if (!clean(tags.name, 160)) return null
  if (!(amenity && FOOD_AMENITIES.has(amenity)) && !(shop && FOOD_SHOPS.has(shop))) return null
  if (tags.disused || tags.abandoned || tags.demolished || tags['disused:amenity'] || tags['abandoned:amenity']) return null
  if (['no', 'private'].includes(tags.access) || ['closed', 'no'].includes(tags.opening_hours)) return null
  const latitude = Number(element.lat ?? element.center?.lat)
  const longitude = Number(element.lon ?? element.center?.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const placeType = amenity || shop!
  return {
    externalSource: OSM_SOURCE,
    externalSourceId: `${element.type}/${element.id}`,
    name: clean(tags.name, 160)!,
    placeType,
    address: addressFromTags(tags),
    city: clean(tags['addr:city'], 120),
    state: clean(tags['addr:state'], 80),
    postalCode: clean(tags['addr:postcode'], 30),
    latitude,
    longitude,
    phone: clean(tags.phone || tags['contact:phone'], 80),
    website: safeWebUrl(tags.website || tags['contact:website']),
    orderUrl: safeWebUrl(tags['website:orders'] || tags['takeaway:website'] || tags['delivery:website']),
    category: placeType.replaceAll('_', ' '),
    cuisine: clean(tags.cuisine, 200)?.replaceAll(';', ', ') || null,
    hours: clean(tags.opening_hours, 500),
    operationalStatus: 'operational',
    providerMetadata: {
      osm_type: element.type,
      osm_id: String(element.id),
      osm_timestamp: element.timestamp || null,
      brand: clean(tags.brand, 160),
      takeaway: clean(tags.takeaway, 40),
      delivery: clean(tags.delivery, 40),
    },
  }
}

export async function fetchOsmFoodPlaces(latitude: number, longitude: number, radiusMeters: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Valid center coordinates are required')
  if (!Number.isInteger(radiusMeters) || radiusMeters < 100 || radiusMeters > 50000) throw new Error('Radius must be between 100 and 50,000 meters')
  const endpoints = process.env.OVERPASS_API_URL
    ? [process.env.OVERPASS_API_URL]
    : [
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://overpass-api.de/api/interpreter',
      ]
  // A bounding-box query is substantially cheaper for shared Overpass instances;
  // the final filter below restores the requested circular radius precisely.
  const latitudeDelta = radiusMeters / 111_320
  const longitudeDelta = radiusMeters / (111_320 * Math.max(Math.cos(latitude * Math.PI / 180), 0.01))
  const bounds = `${latitude - latitudeDelta},${longitude - longitudeDelta},${latitude + latitudeDelta},${longitude + longitudeDelta}`
  const query = `[out:json][timeout:30];(nwr(${bounds})[name][amenity~"^(restaurant|fast_food|cafe|ice_cream|food_court)$"];nwr(${bounds})[name][shop~"^(bakery|confectionery|deli|seafood|pastry)$"];);out center tags meta;`
  let payload: any = null
  const errors: string[] = []
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'HungerSwipes/1.0 (+https://hunger-swipes-theta.vercel.app)' },
        body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(50000), cache: 'no-store',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      payload = await response.json()
      break
    } catch (error: any) { errors.push(`${new URL(endpoint).host}: ${error.message}`) }
  }
  if (!payload) throw new Error(`OpenStreetMap provider unavailable (${errors.join('; ')})`)
  const toRadians = (value: number) => value * Math.PI / 180
  const distanceMeters = (place: ProviderPlace) => {
    const deltaLatitude = toRadians(place.latitude - latitude)
    const deltaLongitude = toRadians(place.longitude - longitude)
    const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(place.latitude)) * Math.sin(deltaLongitude / 2) ** 2
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  const places = (payload.elements || []).map(mapOsmElement).filter(Boolean).filter((place: ProviderPlace) => distanceMeters(place) <= radiusMeters) as ProviderPlace[]
  return Array.from(new Map(places.map(place => [place.externalSourceId, place])).values())
}
