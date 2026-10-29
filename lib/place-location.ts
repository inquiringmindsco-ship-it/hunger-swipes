export type PlaceCoordinates = { latitude: number; longitude: number }

export function parsePlaceCoordinates(latitude: unknown, longitude: unknown): PlaceCoordinates | null {
  if (latitude === null || latitude === undefined || latitude === '' || longitude === null || longitude === undefined || longitude === '') return null
  const parsedLatitude = Number(latitude)
  const parsedLongitude = Number(longitude)
  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) return null
  if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) return null
  return { latitude: parsedLatitude, longitude: parsedLongitude }
}

export function cleanPlaceText(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string') return null
  return value.trim().slice(0, maximum) || null
}
