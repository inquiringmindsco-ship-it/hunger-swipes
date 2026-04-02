// Predefined tag system for HungerSwipes
// More tags = better filtering + higher payouts

export const FOOD_TAGS = [
  'burger', 'pizza', 'tacos', 'pasta', 'wings', 'seafood', 'steak', 'ramen', 'sushi',
  'salad', 'dessert', 'breakfast', 'smoothie', 'coffee', 'soul food', 'BBQ', 'sandwich',
  'fries', 'chicken', 'vegan bowl', 'poke bowl', 'noodles', 'dumplings', 'curry',
  'fried chicken', 'grilled fish', 'poke', 'breakfast burrito', 'waffles', 'pancakes',
  'omelette', 'avocado toast', 'acai bowl', 'protein shake', 'ice cream', 'brownies',
  'cheesecake', 'BBQ ribs', 'hot dog', 'pretzel', 'churros', 'donuts', 'cinnamon rolls'
]

export const DIETARY_TAGS = [
  'vegetarian', 'vegan', 'keto', 'halal', 'kosher', 'gluten-free', 'dairy-free',
  'low-carb', 'high-protein', 'low-calorie', 'cheat meal', 'healthy', 'organic',
  'paleo', 'whole30', 'low-fat', 'sugar-free', 'nut-free'
]

export const CUISINE_TAGS = [
  'American', 'Mexican', 'Italian', 'Chinese', 'Japanese', 'Thai', 'Indian',
  'Mediterranean', 'Cajun', 'Creole', 'Soul Food', 'Caribbean', 'Korean',
  'Vietnamese', 'French', 'Greek', 'Spanish', 'Middle Eastern', 'Ethiopian',
  'Jamaican', 'Hawaiian', 'Filipino'
]

export const EXPERIENCE_TAGS = [
  'spicy', 'sweet', 'crispy', 'cheesy', 'saucy', 'juicy', 'fresh', 'comfort food',
  'late night', 'date night', 'family meal', 'quick bite', 'premium', 'budget',
  'hangover cure', 'work lunch', 'brunch', 'food coma', 'Instagram-worthy', 'value pick'
]

export const PORTION_TAGS = [
  'light', 'regular', 'large', 'shareable', 'worth the price', 'under $10',
  'under $20', 'premium price', 'all-you-can-eat', 'sample size'
]

export const SPICE_LEVELS = [
  { value: 1, label: 'Not spicy' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Hot' },
  { value: 5, label: 'Extremely spicy' }
]

export const HEALTH_CATEGORIES = ['healthy', 'indulgent', 'balanced', 'protein-packed', 'light']

export const PRICE_RANGES = ['$', '$$', '$$$', '$$$$']

export type TagGroup = 'food' | 'dietary' | 'cuisine' | 'experience' | 'portion'

export interface TagOption {
  value: string
  label: string
  group: TagGroup
}

export const ALL_TAGS: TagOption[] = [
  ...FOOD_TAGS.map(t => ({ value: t, label: t, group: 'food' as TagGroup })),
  ...DIETARY_TAGS.map(t => ({ value: t, label: t, group: 'dietary' as TagGroup })),
  ...CUISINE_TAGS.map(t => ({ value: t, label: t, group: 'cuisine' as TagGroup })),
  ...EXPERIENCE_TAGS.map(t => ({ value: t, label: t, group: 'experience' as TagGroup })),
  ...PORTION_TAGS.map(t => ({ value: t, label: t, group: 'portion' as TagGroup })),
]

// Get tags by group
export function getTagsByGroup(group: TagGroup): string[] {
  switch (group) {
    case 'food':
      return FOOD_TAGS
    case 'dietary':
      return DIETARY_TAGS
    case 'cuisine':
      return CUISINE_TAGS
    case 'experience':
      return EXPERIENCE_TAGS
    case 'portion':
      return PORTION_TAGS
  }
}

// Search tags
export function searchTags(query: string, group?: TagGroup): TagOption[] {
  const lower = query.toLowerCase()
  return ALL_TAGS.filter(tag => {
    const matchesQuery = tag.value.toLowerCase().includes(lower) || tag.label.toLowerCase().includes(lower)
    const matchesGroup = !group || tag.group === group
    return matchesQuery && matchesGroup
  })
}
