import type { ProviderPlace } from './openstreetmap-places.ts'

export function normalizePlaceText(value: unknown) {
  return String(value || '').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase()
}

export function normalizePhone(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10)
}

function coordinateDistanceMeters(a: any, b: ProviderPlace) {
  if (a.latitude == null || a.longitude == null) return Infinity
  const lat = (Number(a.latitude) + b.latitude) * Math.PI / 360
  const x = (b.longitude - Number(a.longitude)) * Math.cos(lat)
  const y = b.latitude - Number(a.latitude)
  return Math.sqrt(x * x + y * y) * Math.PI / 180 * 6371000
}

export function findDuplicate(existing: any[], place: ProviderPlace) {
  const strong = existing.find(row => row.external_source === place.externalSource && row.external_source_id === place.externalSourceId)
  if (strong) return strong
  const name = normalizePlaceText(place.name)
  const address = normalizePlaceText(place.address)
  const phone = normalizePhone(place.phone)
  return existing.find(row => {
    if (normalizePlaceText(row.name) !== name) return false
    if (address && normalizePlaceText(row.address) === address) return true
    if (phone && normalizePhone(row.phone) === phone) return true
    return coordinateDistanceMeters(row, place) <= 60
  })
}
