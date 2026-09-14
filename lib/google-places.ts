import { normalizePlaceText, normalizePhone } from './place-dedup.ts'

const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1'

type MatchablePlace = { name: string; address?: string | null; latitude?: number | null; longitude?: number | null; phone?: string | null }
type GoogleCandidate = { id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number }; nationalPhoneNumber?: string }

function distanceMeters(place: MatchablePlace, candidate: GoogleCandidate) {
  if (place.latitude == null || place.longitude == null || candidate.location?.latitude == null || candidate.location?.longitude == null) return Infinity
  const lat = (Number(place.latitude) + candidate.location.latitude) * Math.PI / 360
  const x = (candidate.location.longitude - Number(place.longitude)) * Math.cos(lat)
  const y = candidate.location.latitude - Number(place.latitude)
  return Math.sqrt(x * x + y * y) * Math.PI / 180 * 6_371_000
}

export function scoreGoogleCandidate(place: MatchablePlace, candidate: GoogleCandidate) {
  const expectedName = normalizePlaceText(place.name)
  const actualName = normalizePlaceText(candidate.displayName?.text)
  if (!expectedName || expectedName !== actualName) return 0
  let score = 0.5
  const distance = distanceMeters(place, candidate)
  if (distance <= 75) score += 0.35
  else if (distance <= 200) score += 0.25
  const expectedAddress = new Set(normalizePlaceText(place.address).split(' ').filter(token => token.length > 2))
  const actualAddress = new Set(normalizePlaceText(candidate.formattedAddress).split(' ').filter(token => token.length > 2))
  const addressOverlap = expectedAddress.size ? [...expectedAddress].filter(token => actualAddress.has(token)).length / expectedAddress.size : 0
  if (addressOverlap >= 0.7) score += 0.15
  const expectedPhone = normalizePhone(place.phone)
  if (expectedPhone && expectedPhone === normalizePhone(candidate.nationalPhoneNumber)) score += 0.15
  return Math.min(score, 1)
}

export async function findHighConfidenceGooglePlace(place: MatchablePlace, apiKey: string) {
  const queryText = [place.name, place.address].filter(Boolean).join(' ')
  const body: Record<string, unknown> = { textQuery: queryText, maxResultCount: 3 }
  if (place.latitude != null && place.longitude != null) body.locationBias = { circle: { center: { latitude: place.latitude, longitude: place.longitude }, radius: 1000 } }
  const response = await fetch(`${GOOGLE_PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Google Places search failed (${response.status})`)
  const payload = await response.json()
  const ranked = (payload.places || []).map((candidate: GoogleCandidate) => ({ candidate, confidence: scoreGoogleCandidate(place, candidate) })).sort((a: any, b: any) => b.confidence - a.confidence)
  const best = ranked[0]
  return best?.candidate?.id && best.confidence >= 0.85 ? { googlePlaceId: best.candidate.id, confidence: best.confidence } : null
}

export async function getLiveGooglePlacePhoto(googlePlaceId: string, apiKey: string, maxWidth = 1200) {
  const details = await fetch(`${GOOGLE_PLACES_BASE}/places/${encodeURIComponent(googlePlaceId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'photos' },
    signal: AbortSignal.timeout(10000), cache: 'no-store',
  })
  if (!details.ok) throw new Error(`Google Place Details failed (${details.status})`)
  const payload = await details.json()
  const photo = payload.photos?.[0]
  if (!photo?.name) return null
  const media = await fetch(`${GOOGLE_PLACES_BASE}/${photo.name}/media?maxWidthPx=${Math.min(Math.max(maxWidth, 400), 1600)}&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
  if (!media.ok) throw new Error(`Google Place Photo failed (${media.status})`)
  const result = await media.json()
  const sourceUrl = photo.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(googlePlaceId)}`
  return result.photoUri ? { photoUrl: result.photoUri, authorAttributions: photo.authorAttributions || [], googleMapsUri: sourceUrl } : null
}
