import test from 'node:test'
import assert from 'node:assert/strict'
import { boundedLimit, isHttpsUrl, normalizeContentKind } from '../lib/food.ts'
import { hasValidImageSignature, MAX_IMAGE_BYTES, validateImageMetadata } from '../lib/upload-validation.ts'
import { mapOsmElement } from '../lib/openstreetmap-places.ts'
import { findDuplicate } from '../lib/place-dedup.ts'
import { formatPhone, getAppleMapsUrl, getCallUrl, getGoogleMapsUrl } from '../lib/place-actions.ts'
import { scoreGoogleCandidate } from '../lib/google-places.ts'

test('content kinds reject arbitrary table selectors', () => {
  assert.equal(normalizeContentKind('official'), 'official')
  assert.equal(normalizeContentKind('community'), 'community')
  assert.equal(normalizeContentKind('dishes);drop table'), null)
})

test('limits remain bounded and valid', () => {
  assert.equal(boundedLimit('0'), 1)
  assert.equal(boundedLimit('999'), 100)
  assert.equal(boundedLimit('invalid'), 20)
})

test('public links require HTTPS', () => {
  assert.equal(isHttpsUrl('https://example.com/order'), true)
  assert.equal(isHttpsUrl('javascript:alert(1)'), false)
  assert.equal(isHttpsUrl('http://example.com'), false)
})

test('upload metadata and magic bytes must agree', () => {
  assert.equal(validateImageMetadata('text/html', 20).ok, false)
  assert.equal(validateImageMetadata('image/png', MAX_IMAGE_BYTES + 1).ok, false)
  assert.equal(validateImageMetadata('image/png', 20).ok, true)
  assert.equal(hasValidImageSignature('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47])), true)
  assert.equal(hasValidImageSignature('image/png', new Uint8Array([0x3c, 0x68, 0x74, 0x6d])), false)
})

test('OpenStreetMap food records retain provider identity and real metadata', () => {
  const place = mapOsmElement({ type: 'node', id: 123, lat: 38.74, lon: -90.3, timestamp: '2026-01-01', tags: { name: 'Local Cafe', amenity: 'cafe', 'addr:housenumber': '10', 'addr:street': 'Main St', 'addr:city': 'Ferguson', 'addr:state': 'MO', phone: '+1 314 555 0100', cuisine: 'coffee_shop' } })
  assert.equal(place?.externalSourceId, 'node/123')
  assert.equal(place?.address, '10 Main St, Ferguson, MO')
  assert.equal(place?.operationalStatus, 'operational')
  assert.equal(mapOsmElement({ type: 'node', id: 124, lat: 1, lon: 1, tags: { name: 'Closed Cafe', amenity: 'cafe', disused: 'yes' } }), null)
})

test('place deduplication prefers provider ID and falls back to name/address', () => {
  const provider = mapOsmElement({ type: 'node', id: 123, lat: 38.74, lon: -90.3, tags: { name: 'Local Cafe', amenity: 'cafe', 'addr:housenumber': '10', 'addr:street': 'Main St' } })!
  assert.equal(findDuplicate([{ id: 'a', external_source: 'openstreetmap', external_source_id: 'node/123' }], provider)?.id, 'a')
  assert.equal(findDuplicate([{ id: 'b', name: 'LOCAL CAFE', address: '10 Main St', latitude: 0, longitude: 0 }], provider)?.id, 'b')
})

test('place actions preserve exact chain locations and normalize US phone numbers', () => {
  const north = { name: "Domino's", address: '10486 West Florissant Avenue', latitude: 38.758, longitude: -90.28, phone: '+1 314-555-0101' }
  const south = { name: "Domino's", address: '9432 Natural Bridge Road', latitude: 38.71, longitude: -90.36, phone: '314.555.0202' }
  assert.notEqual(getGoogleMapsUrl(north), getGoogleMapsUrl(south))
  assert.notEqual(getAppleMapsUrl(north), getAppleMapsUrl(south))
  assert.equal(getCallUrl(north), 'tel:+13145550101')
  assert.equal(getCallUrl(south), 'tel:3145550202')
  assert.equal(formatPhone(north.phone), '(314) 555-0101')
  assert.equal(getCallUrl({ name: 'No Phone' }), null)
})

test('Google matching requires exact normalized name and close coordinates', () => {
  const place = { name: 'Local Cafe', address: '10 Main Street', latitude: 38.74, longitude: -90.3 }
  assert.ok(scoreGoogleCandidate(place, { id: 'good', displayName: { text: 'Local Cafe' }, formattedAddress: '10 Main Street, Ferguson, MO', location: { latitude: 38.7401, longitude: -90.3001 } }) >= 0.85)
  assert.equal(scoreGoogleCandidate(place, { id: 'wrong', displayName: { text: 'Other Cafe' }, formattedAddress: '10 Main Street', location: { latitude: 38.7401, longitude: -90.3001 } }), 0)
})
