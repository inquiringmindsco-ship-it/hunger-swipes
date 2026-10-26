import { describe, expect, it } from 'vitest'
import { authValueCopy, safeNextRoute } from '@/lib/auth-routes'

describe('auth next-route restoration', () => {
  it('preserves an internal signup next route', () => expect(safeNextRoute('/swipe')).toBe('/swipe'))
  it('preserves internal query strings', () => expect(safeNextRoute('/join?ref=abc')).toBe('/join?ref=abc'))
  it('rejects external and protocol-relative redirects', () => {
    expect(safeNextRoute('https://attacker.example')).toBe('/swipe')
    expect(safeNextRoute('//attacker.example')).toBe('/swipe')
  })
  it('explains the value of the requested signed-out destination', () => {
    expect(authValueCopy('/saved').title).toMatch(/dish/i)
    expect(authValueCopy('/history').body).toMatch(/revisit/i)
    expect(authValueCopy('/post').body).toMatch(/post food/i)
    expect(authValueCopy('/seller/dashboard').title).toMatch(/food/i)
  })
})
