import { describe, expect, it } from 'vitest'
import { safeNextRoute } from '@/lib/auth-routes'

describe('auth next-route restoration', () => {
  it('preserves an internal signup next route', () => expect(safeNextRoute('/swipe')).toBe('/swipe'))
  it('preserves internal query strings', () => expect(safeNextRoute('/join?ref=abc')).toBe('/join?ref=abc'))
  it('rejects external and protocol-relative redirects', () => {
    expect(safeNextRoute('https://attacker.example')).toBe('/swipe')
    expect(safeNextRoute('//attacker.example')).toBe('/swipe')
  })
})
