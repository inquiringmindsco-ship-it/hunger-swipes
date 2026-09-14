export type ActionablePlace = {
  name: string
  address?: string | null
  city?: string | null
  state?: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  website?: string | null
  order_url?: string | null
}

export function normalizePhoneForTel(phone: unknown) {
  if (typeof phone !== 'string') return null
  const trimmed = phone.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

export function formatPhone(phone: unknown) {
  const tel = normalizePhoneForTel(phone)
  if (!tel) return null
  const digits = tel.replace(/\D/g, '')
  const us = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (us.length === 10) return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`
  return String(phone).trim()
}

export function getCallUrl(place: ActionablePlace) {
  const phone = normalizePhoneForTel(place.phone)
  return phone ? `tel:${phone}` : null
}

export function getPlaceDestination(place: ActionablePlace) {
  const latitude = Number(place.latitude)
  const longitude = Number(place.longitude)
  if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) return `${latitude},${longitude}`
  if (place.address?.trim()) return place.address.trim()
  return [place.name, place.city, place.state].filter(Boolean).join(', ')
}

export function getAppleMapsUrl(place: ActionablePlace) {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(getPlaceDestination(place))}`
}

export function getGoogleMapsUrl(place: ActionablePlace) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getPlaceDestination(place))}`
}

export function safePlaceWebUrl(value: unknown) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch { return null }
}
