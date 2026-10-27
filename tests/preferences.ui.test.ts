import { beforeEach, describe, expect, it } from 'vitest'
import { clearDiscoveryPreferences, DEFAULT_DISCOVERY_PREFERENCES, DISCOVERY_PREFERENCES_KEY, DISCOVERY_RADIUS_OPTIONS, normalizeDiscoveryPreferences, readDiscoveryPreferences, writeDiscoveryPreferences } from '@/lib/preferences'

describe('canonical discovery preferences', () => {
  const storage = window.localStorage
  beforeEach(() => storage.clear())

  it('migrates legacy values without deleting their source', () => {
    storage.setItem('hw_prefs', JSON.stringify({ dietaryRestrictions: ['Vegan'], favoriteCuisines: ['Thai'], distanceMiles: 25 }))
    const result = readDiscoveryPreferences()
    expect(result.source).toBe('hw_prefs')
    expect(result.preferences.dietary).toEqual(['Vegan'])
    expect(result.preferences.cuisines).toEqual(['Thai'])
    expect(storage.getItem('hw_prefs')).not.toBeNull()
  })

  it('writes one canonical model and only clears legacy data explicitly', () => {
    storage.setItem('hungerswipes_preferences', '{}')
    writeDiscoveryPreferences({ version: 1, dietary: ['Halal'], cuisines: [], health: [], spice: 2, price: ['$$'], distanceMiles: 10 })
    expect(JSON.parse(storage.getItem(DISCOVERY_PREFERENCES_KEY) || '{}').dietary).toEqual(['Halal'])
    expect(storage.getItem('hungerswipes_preferences')).not.toBeNull()
    clearDiscoveryPreferences()
    expect(storage.length).toBe(0)
  })

  it('defaults local discovery to 3 miles and accepts only launch radius choices', () => {
    expect(DEFAULT_DISCOVERY_PREFERENCES.distanceMiles).toBe(3)
    expect(DISCOVERY_RADIUS_OPTIONS).toEqual([1, 3, 5, 10, 15])
    expect(normalizeDiscoveryPreferences({ distanceMiles: 1 }).distanceMiles).toBe(1)
    expect(normalizeDiscoveryPreferences({ distanceMiles: 15 }).distanceMiles).toBe(15)
    expect(normalizeDiscoveryPreferences({ distanceMiles: 25 }).distanceMiles).toBe(3)
  })
})
