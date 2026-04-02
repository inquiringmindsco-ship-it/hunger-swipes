// Metadata completeness scoring for HungerSwipes
// Higher completeness = better ranking + higher payout tier

export interface PhotoMetadata {
  title?: string
  description?: string
  tags?: string[]
  dietary_tags?: string[]
  ingredient_tags?: string[]
  cuisine_tags?: string[]
  calories?: number
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  spice_level?: number
  portion_size?: 'light' | 'regular' | 'large' | 'shareable'
  restaurant_name?: string
  location_text?: string
  price?: number
  vegetarian_option?: boolean
  vegan_option?: boolean
  gluten_free_option?: boolean
  health_category?: string
}

export interface CompletenessResult {
  score: number
  breakdown: {
    title: number
    description: number
    tags: number
    dietaryTags: number
    cuisineTags: number
    calories: number
    macros: number
    price: number
    restaurant: number
    portionSize: number
    ingredientTags: number
    dietOptions: number
    spiceOrHealth: number
  }
  missingItems: string[]
}

// Completeness score calculation (0-100)
export function calculateCompletenessScore(metadata: PhotoMetadata): CompletenessResult {
  let score = 0
  const missingItems: string[] = []
  
  const breakdown = {
    title: 0,
    description: 0,
    tags: 0,
    dietaryTags: 0,
    cuisineTags: 0,
    calories: 0,
    macros: 0,
    price: 0,
    restaurant: 0,
    portionSize: 0,
    ingredientTags: 0,
    dietOptions: 0,
    spiceOrHealth: 0,
  }

  // Title: 5 points
  if (metadata.title?.trim()) {
    breakdown.title = 5
    score += 5
  } else {
    missingItems.push('Add a descriptive title')
  }

  // Description: 10 points
  const descTrimmed = metadata.description?.trim() || ''
  const descLength = descTrimmed.length
  if (descLength >= 20) {
    breakdown.description = 10
    score += 10
  } else if (descLength > 0) {
    breakdown.description = 5
    score += 5
    missingItems.push('Add more detail to your description (20+ chars)')
  } else {
    missingItems.push('Add a detailed description (20+ characters)')
  }

  // At least 3 tags: 15 points
  if (metadata.tags && metadata.tags.length >= 3) {
    breakdown.tags = 15
    score += 15
  } else if (metadata.tags && metadata.tags.length > 0) {
    breakdown.tags = 5
    score += 5
    missingItems.push('Add more food tags (need 3+)')
  } else {
    missingItems.push('Add at least 3 food tags')
  }

  // Dietary tags: 10 points
  if (metadata.dietary_tags && metadata.dietary_tags.length > 0) {
    breakdown.dietaryTags = 10
    score += 10
  } else {
    missingItems.push('Add dietary tags (vegetarian, keto, etc.)')
  }

  // Cuisine tag: 5 points
  if (metadata.cuisine_tags && metadata.cuisine_tags.length > 0) {
    breakdown.cuisineTags = 5
    score += 5
  } else {
    missingItems.push('Add a cuisine tag')
  }

  // Calories: 10 points
  if (metadata.calories) {
    breakdown.calories = 10
    score += 10
  } else {
    missingItems.push('Add calorie information')
  }

  // Macros (protein, carbs, fat): 10 points
  if (metadata.protein_grams && metadata.carbs_grams && metadata.fat_grams) {
    breakdown.macros = 10
    score += 10
  } else {
    missingItems.push('Add macro nutrients (protein, carbs, fat)')
  }

  // Price: 10 points
  if (metadata.price) {
    breakdown.price = 10
    score += 10
  } else {
    missingItems.push('Add price information')
  }

  // Restaurant/location: 10 points
  if (metadata.restaurant_name && metadata.location_text) {
    breakdown.restaurant = 10
    score += 10
  } else if (metadata.restaurant_name || metadata.location_text) {
    breakdown.restaurant = 5
    score += 5
    missingItems.push('Add both restaurant name AND location')
  } else {
    missingItems.push('Add restaurant name and location')
  }

  // Portion size: 5 points
  if (metadata.portion_size) {
    breakdown.portionSize = 5
    score += 5
  } else {
    missingItems.push('Add portion size (light, regular, large, shareable)')
  }

  // Ingredient tags: 5 points
  if (metadata.ingredient_tags && metadata.ingredient_tags.length >= 3) {
    breakdown.ingredientTags = 5
    score += 5
  } else if (metadata.ingredient_tags && metadata.ingredient_tags.length > 0) {
    breakdown.ingredientTags = 2
    score += 2
    missingItems.push('Add more ingredient tags (need 3+)')
  } else {
    missingItems.push('Add ingredient tags (main ingredients)')
  }

  // Veg/vegan/gluten-free details: 10 points
  if (metadata.vegetarian_option || metadata.vegan_option || metadata.gluten_free_option) {
    breakdown.dietOptions = 10
    score += 10
  } else {
    missingItems.push('Add dietary option flags (vegetarian, vegan, gluten-free)')
  }

  // Spice level or health category: 5 points
  if (metadata.spice_level || metadata.health_category) {
    breakdown.spiceOrHealth = 5
    score += 5
  } else {
    missingItems.push('Add spice level or health category')
  }

  return {
    score: Math.min(100, score),
    breakdown,
    missingItems
  }
}

// Determine payout tier based on completeness (0-30: 85%, 31-70: 90%, 71-100: 95%)
export function getPayoutTier(completenessScore: number): {
  tier: 'basic' | 'enhanced' | 'top-tier'
  tierLabel: string
  creatorRate: number
  color: string
  description: string
} {
  if (completenessScore >= 71) {
    return {
      tier: 'top-tier',
      tierLabel: 'Top Earning',
      creatorRate: 0.95,
      color: '#FFD700',
      description: 'Maximum visibility + 95% creator payout!'
    }
  } else if (completenessScore >= 31) {
    return {
      tier: 'enhanced',
      tierLabel: 'Enhanced',
      creatorRate: 0.90,
      color: '#10B981',
      description: 'Boosted ranking + 90% creator payout'
    }
  } else {
    return {
      tier: 'basic',
      tierLabel: 'Basic',
      creatorRate: 0.85,
      color: '#6B7280',
      description: 'Standard ranking + 85% creator payout'
    }
  }
}

// Get tier badge info
export function getTierBadge(completenessScore: number): {
  tier: string
  label: string
  color: string
  bgColor: string
} {
  if (completenessScore >= 71) {
    return {
      tier: 'top-tier',
      label: '⭐ Top Earning',
      color: '#FFD700',
      bgColor: 'bg-[#FFD700]/20'
    }
  } else if (completenessScore >= 31) {
    return {
      tier: 'enhanced',
      label: '✨ Enhanced',
      color: '#10B981',
      bgColor: 'bg-[#10B981]/20'
    }
  } else {
    return {
      tier: 'basic',
      label: 'Basic',
      color: '#6B7280',
      bgColor: 'bg-gray-500/20'
    }
  }
}

// Calculate potential earnings boost
export function calculateEarningsBoost(basePrice: number, currentScore: number, targetScore: number): {
  currentEarnings: number
  potentialEarnings: number
  boostPercent: number
} {
  const currentTier = getPayoutTier(currentScore)
  const targetTier = getPayoutTier(targetScore)
  
  // Commission is basePrice * commissionRate (e.g., 10% default)
  const commissionAmount = basePrice * 0.10
  
  const currentEarnings = commissionAmount * currentTier.creatorRate
  const potentialEarnings = commissionAmount * targetTier.creatorRate
  
  return {
    currentEarnings: Math.round(currentEarnings * 100) / 100,
    potentialEarnings: Math.round(potentialEarnings * 100) / 100,
    boostPercent: Math.round(((potentialEarnings - currentEarnings) / currentEarnings) * 100)
  }
}

// ============================================================
// VIRAL SCORE CALCULATION
// ============================================================
export interface ViralFactors {
  swipesRight: number
  saves: number
  superHungers: number
  totalSwipes: number
  engagementTimeSeconds?: number
  commentCount?: number
  shareCount?: number
}

export interface ViralResult {
  score: number
  isTrending: boolean
  isHighDemand: boolean
  eligibleForMonetization: boolean
  thresholds: {
    trendingThreshold: number
    highDemandThreshold: number
    monetizationThreshold: number
  }
}

// Viral score thresholds
const TRENDING_THRESHOLD = 50   // 50+ right swipes + saves
const HIGH_DEMAND_THRESHOLD = 100 // 100+ combined engagement
const MONETIZATION_THRESHOLD = 200 // 200+ eligible for advanced monetization

export function calculateViralScore(factors: ViralFactors): ViralResult {
  const { swipesRight, saves, superHungers, totalSwipes, engagementTimeSeconds = 0, commentCount = 0, shareCount = 0 } = factors
  
  // Base engagement
  const rightSwipeScore = swipesRight * 1.0
  const saveScore = saves * 2.0  // Saves are more valuable
  const superScore = superHungers * 3.0  // Supers are most valuable
  
  // Engagement depth bonus (avg time spent, comments, shares)
  const engagementDepth = Math.min(50, (engagementTimeSeconds / 60) * 0.5) // max 50 points
  const commentBonus = Math.min(30, commentCount * 2) // max 30 points
  const shareBonus = Math.min(40, shareCount * 5) // max 40 points
  
  // Calculate score
  const score = Math.round(
    rightSwipeScore + saveScore + superScore + engagementDepth + commentBonus + shareBonus
  )
  
  // Determine flags
  const combinedEngagement = swipesRight + saves + superHungers
  const isTrending = combinedEngagement >= TRENDING_THRESHOLD
  const isHighDemand = combinedEngagement >= HIGH_DEMAND_THRESHOLD
  const eligibleForMonetization = combinedEngagement >= MONETIZATION_THRESHOLD
  
  return {
    score,
    isTrending,
    isHighDemand,
    eligibleForMonetization,
    thresholds: {
      trendingThreshold: TRENDING_THRESHOLD,
      highDemandThreshold: HIGH_DEMAND_THRESHOLD,
      monetizationThreshold: MONETIZATION_THRESHOLD
    }
  }
}

// Determine content label based on metrics
export function getContentLabel(
  isVerified: boolean,
  hasPaidRecipe: boolean,
  viralResult: ViralResult
): 'discovery' | 'trending' | 'monetized' | 'verified_kitchen' {
  if (isVerified) return 'verified_kitchen'
  if (hasPaidRecipe) return 'monetized'
  if (viralResult.isTrending) return 'trending'
  return 'discovery'
}
