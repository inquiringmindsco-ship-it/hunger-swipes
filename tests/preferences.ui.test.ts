import { beforeEach, describe, expect, it } from 'vitest'
import { clearDiscoveryPreferences, DISCOVERY_PREFERENCES_KEY, readDiscoveryPreferences, writeDiscoveryPreferences } from '@/lib/preferences'

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
})
