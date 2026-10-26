export const ADDRESS_SEARCH_ATTRIBUTION = {
  text: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
}

export type AddressSuggestion = {
  id: string
  formattedAddress: string
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  latitude: number
  longitude: number
}

function clean(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null
}

export function mapNominatimAddress(row: any): AddressSuggestion | null {
  const latitude = Number(row?.lat)
  const longitude = Number(row?.lon)
  const formattedAddress = clean(row?.display_name)
  if (!formattedAddress || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const address = row?.address || {}
  const streetLine = [clean(address.house_number, 30), clean(address.road || address.pedestrian || address.footway, 160)].filter(Boolean).join(' ')
  return {
    id: `${clean(row?.osm_type, 20) || 'place'}/${clean(String(row?.osm_id ?? ''), 40) || row.place_id}`,
    formattedAddress,
    street: streetLine || null,
    city: clean(address.city || address.town || address.village || address.hamlet || address.municipality, 120),
    state: clean(address.state, 80),
    postalCode: clean(address.postcode, 30),
    latitude,
    longitude,
  }
}
