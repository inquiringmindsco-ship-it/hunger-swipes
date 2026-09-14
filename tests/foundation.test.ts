import test from 'node:test'
import assert from 'node:assert/strict'
import { boundedLimit, isHttpsUrl, normalizeContentKind } from '../lib/food.ts'
import { hasValidImageSignature, MAX_IMAGE_BYTES, validateImageMetadata } from '../lib/upload-validation.ts'
import { mapOsmElement } from '../lib/openstreetmap-places.ts'
import { findDuplicate } from '../lib/place-dedup.ts'

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
