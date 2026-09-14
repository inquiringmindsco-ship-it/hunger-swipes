import test from 'node:test'
import assert from 'node:assert/strict'
import { boundedLimit, isHttpsUrl, normalizeContentKind } from '../lib/food.ts'
import { hasValidImageSignature, MAX_IMAGE_BYTES, validateImageMetadata } from '../lib/upload-validation.ts'

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
