// Eater preferences system for HungerSwipes
// Stored in localStorage, used to filter and boost feed

import { CUISINE_TAGS, DIETARY_TAGS, HEALTH_CATEGORIES } from './tags'

export interface EaterPreferences {
  dietaryRestrictions: string[]
  favoriteCuisines: string[]
  priceRange: string[]
  spicePreference: number // 1-5
  healthFocus: string[]
  // Advanced
  excludeIngredients: string[]
  minCalories?: number
  maxCalories?: number
}

const PREFERENCES_KEY = 'hungerswipes_preferences'

export const DEFAULT_PREFERENCES: EaterPreferences = {
  dietaryRestrictions: [],
  favoriteCuisines: [],
  priceRange: ['$', '$$', '$$$', '$$$$'],
  spicePreference: 3,
  healthFocus: [],
  excludeIngredients: [],
}

// Load preferences from localStorage
export function loadPreferences(): EaterPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load preferences:', e)
  }
  return DEFAULT_PREFERENCES
}

// Save preferences to localStorage
export function savePreferences(prefs: EaterPreferences): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Failed to save preferences:', e)
  }
}

// Clear preferences
export function clearPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFERENCES_KEY)
}

// Filter photos based on preferences
export interface PhotoForFilter {
  dietary_tags?: string[]
  cuisine_tags?: string[]
  price_range?: string
  spice_level?: number
  health_category?: string
  calories?: number
  tags?: string[]
  ingredient_tags?: string[]
  vegetarian_option?: boolean
  vegan_option?: boolean
  gluten_free_option?: boolean
}

export interface FilterResult {
  matches: boolean
  score: number // 0-100, how well it matches
  reasons: string[]
}

export function filterPhoto(photo: PhotoForFilter, prefs: EaterPreferences): FilterResult {
  const reasons: string[] = []
  let score = 0
  let matches = true

  // Check dietary restrictions
  if (prefs.dietaryRestrictions.length > 0) {
    const hasRestrictionMatch = prefs.dietaryRestrictions.some(restriction => {
      // Check both dietary_tags and option flags
      const inTags = photo.dietary_tags?.includes(restriction.toLowerCase())
      const inFlags = 
        (restriction.toLowerCase() === 'vegetarian' && photo.vegetarian_option) ||
        (restriction.toLowerCase() === 'vegan' && photo.vegan_option) ||
        (restriction.toLowerCase() === 'gluten-free' && photo.gluten_free_option)
      return inTags || inFlags
    })
    
    if (!hasRestrictionMatch && prefs.dietaryRestrictions.length > 0) {
      // Soft filter - don't exclude, just score lower
      score -= 20
      reasons.push('Does not match dietary restrictions')
    } else {
      score += 15
      reasons.push('Matches dietary preference')
    }
  }

  // Check favorite cuisines
  if (prefs.favoriteCuisines.length > 0) {
    const cuisineMatch = prefs.favoriteCuisines.some(cuisine => 
      photo.cuisine_tags?.map(c => c.toLowerCase()).includes(cuisine.toLowerCase())
    )
    if (cuisineMatch) {
      score += 20
      reasons.push('Matches favorite cuisine')
    } else if (prefs.favoriteCuisines.length > 0) {
      // Don't exclude, just score lower
      score -= 10
    }
  }

  // Check price range
  if (prefs.priceRange.length > 0 && photo.price_range) {
    if (prefs.priceRange.includes(photo.price_range)) {
      score += 15
      reasons.push('In preferred price range')
    } else {
      matches = false // Hard filter on price
      reasons.push('Outside preferred price range')
    }
  }

  // Check spice preference
  if (photo.spice_level && prefs.spicePreference) {
    const diff = Math.abs(photo.spice_level - prefs.spicePreference)
    if (diff === 0) {
      score += 10
    } else if (diff === 1) {
      score += 5
    } else {
      score -= 5 * diff
    }
  }

  // Check health focus
  if (prefs.healthFocus.length > 0 && photo.health_category) {
    const healthMatch = prefs.healthFocus.includes(photo.health_category.toLowerCase())
    if (healthMatch) {
      score += 10
      reasons.push('Matches health goal')
    }
  }

  // Check calorie range
  if (photo.calories) {
    if (prefs.minCalories && photo.calories < prefs.minCalories) {
      score -= 10
      reasons.push('Below minimum calories')
    }
    if (prefs.maxCalories && photo.calories > prefs.maxCalories) {
      score -= 10
      reasons.push('Above maximum calories')
    }
  }

  // Check excluded ingredients
  if (prefs.excludeIngredients.length > 0 && photo.ingredient_tags) {
    const hasExcluded = prefs.excludeIngredients.some(excl =>
      photo.ingredient_tags?.map(i => i.toLowerCase()).includes(excl.toLowerCase())
    )
    if (hasExcluded) {
      matches = false
      reasons.push('Contains excluded ingredient')
    }
  }

  return {
    matches,
    score: Math.max(0, Math.min(100, score + 50)), // Normalize to 0-100
    reasons
  }
}

// Boost ranking for photos matching preferences
export function boostForPreferences(
  baseScore: number,
  photo: PhotoForFilter,
  prefs: EaterPreferences
): number {
  const filterResult = filterPhoto(photo, prefs)
  
  // Apply boost based on match score
  // filterResult.score is 0-100, we use it to boost 0-20%
  const boostPercent = (filterResult.score - 50) / 5 // Maps 0-100 to -10% to +10%
  
  return baseScore * (1 + boostPercent / 100)
}

// Learn preferences from swipe history
export function learnPreferences(
  currentPrefs: EaterPreferences,
  swipedPhoto: PhotoForFilter,
  wasPositiveSwipe: boolean // right or up
): EaterPreferences {
  if (!wasPositiveSwipe) return currentPrefs
  
  const newPrefs = { ...currentPrefs }
  
  // Learn from dietary tags on positive swipes
  if (swipedPhoto.dietary_tags && swipedPhoto.dietary_tags.length > 0) {
    const combined = [...newPrefs.dietaryRestrictions, ...swipedPhoto.dietary_tags]
    const unique = combined.filter((v, i, a) => a.indexOf(v) === i)
    newPrefs.dietaryRestrictions = unique.slice(0, 5) // Keep max 5
  }
  
  // Learn from cuisine tags
  if (swipedPhoto.cuisine_tags && swipedPhoto.cuisine_tags.length > 0) {
    const combined = [...newPrefs.favoriteCuisines, ...swipedPhoto.cuisine_tags]
    const unique = combined.filter((v, i, a) => a.indexOf(v) === i)
    newPrefs.favoriteCuisines = unique.slice(0, 5) // Keep max 5
  }
  
  // Learn spice level
  if (swipedPhoto.spice_level) {
    // Weighted average with existing preference
    newPrefs.spicePreference = Math.round(
      (newPrefs.spicePreference + swipedPhoto.spice_level) / 2
    )
  }
  
  // Learn health category
  if (swipedPhoto.health_category && !newPrefs.healthFocus.includes(swipedPhoto.health_category)) {
    newPrefs.healthFocus = [...newPrefs.healthFocus, swipedPhoto.health_category].slice(0, 3)
  }
  
  return newPrefs
}
