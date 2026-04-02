// Feed ranking algorithm for HungerSwipes
// Weights: hunger_score, completeness, viral, recency, order velocity

export interface RankingFactors {
  hungerScore: number       // 0-100, engagement metric
  completenessScore: number // 0-100, metadata quality
  viralScore: number        // 0+, viral engagement
  createdAt: Date
  orderVelocity: number     // orders per hour since creation
}

export interface RankingResult {
  rankScore: number
  breakdown: {
    hungerComponent: number
    completenessComponent: number
    viralComponent: number
    recencyComponent: number
    velocityComponent: number
  }
  percentile?: number
}

// Weights for ranking factors
const HUNGER_WEIGHT = 0.40
const COMPLETENESS_WEIGHT = 0.20
const VIRAL_WEIGHT = 0.15
const RECENCY_WEIGHT = 0.15
const VELOCITY_WEIGHT = 0.10

export function calculateRankScore(factors: RankingFactors): number {
  const {
    hungerScore,
    completenessScore,
    viralScore,
    createdAt,
    orderVelocity
  } = factors

  // Recency: fresh content gets a boost (max 100 at 0 hours, 0 at 168 hours / 1 week)
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  const recencyBoost = Math.max(0, 100 - (hoursOld / 1.68))

  // Order velocity: normalize (cap at 10 orders/hour for max score)
  const velocityScore = Math.min(100, orderVelocity * 10)

  // Viral score: normalize (cap at 500 for max)
  const normalizedViral = Math.min(100, viralScore / 5)

  const score = 
    (hungerScore * HUNGER_WEIGHT) +
    (completenessScore * COMPLETENESS_WEIGHT) +
    (normalizedViral * VIRAL_WEIGHT) +
    (recencyBoost * RECENCY_WEIGHT) +
    (velocityScore * VELOCITY_WEIGHT)

  return Math.round(score * 100) / 100
}

export function calculateRankScoreDetailed(factors: RankingFactors): RankingResult {
  const {
    hungerScore,
    completenessScore,
    viralScore,
    createdAt,
    orderVelocity
  } = factors

  // Recency: fresh content gets a boost (max 100 at 0 hours, 0 at 168 hours / 1 week)
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  const recencyBoost = Math.max(0, 100 - (hoursOld / 1.68))

  // Order velocity: normalize (cap at 10 orders/hour for max score)
  const velocityScore = Math.min(100, orderVelocity * 10)

  // Viral score: normalize (cap at 500 for max)
  const normalizedViral = Math.min(100, viralScore / 5)

  const hungerComponent = hungerScore * HUNGER_WEIGHT
  const completenessComponent = completenessScore * COMPLETENESS_WEIGHT
  const viralComponent = normalizedViral * VIRAL_WEIGHT
  const recencyComponent = recencyBoost * RECENCY_WEIGHT
  const velocityComponent = velocityScore * VELOCITY_WEIGHT

  const rankScore = Math.round(
    (hungerComponent + completenessComponent + viralComponent + recencyComponent + velocityComponent) * 100
  ) / 100

  return {
    rankScore,
    breakdown: {
      hungerComponent: Math.round(hungerComponent * 100) / 100,
      completenessComponent: Math.round(completenessComponent * 100) / 100,
      viralComponent: Math.round(viralComponent * 100) / 100,
      recencyComponent: Math.round(recencyComponent * 100) / 100,
      velocityComponent: Math.round(velocityComponent * 100) / 100,
    }
  }
}

// Estimate percentile based on rank score
export function estimatePercentile(rankScore: number): number {
  if (rankScore >= 80) return 95
  if (rankScore >= 70) return 85
  if (rankScore >= 60) return 70
  if (rankScore >= 50) return 50
  if (rankScore >= 40) return 30
  if (rankScore >= 30) return 15
  return 5
}

// Sort photos by rank score
export function sortByRankScore<T extends { hungerScore: number, completenessScore?: number, viralScore?: number, createdAt: string | Date, orderVelocity?: number }>(
  photos: T[]
): T[] {
  return [...photos].sort((a, b) => {
    const scoreA = calculateRankScore({
      hungerScore: a.hungerScore || 0,
      completenessScore: a.completenessScore || 0,
      viralScore: a.viralScore || 0,
      createdAt: new Date(a.createdAt),
      orderVelocity: a.orderVelocity || 0
    })
    const scoreB = calculateRankScore({
      hungerScore: b.hungerScore || 0,
      completenessScore: b.completenessScore || 0,
      viralScore: b.viralScore || 0,
      createdAt: new Date(b.createdAt),
      orderVelocity: b.orderVelocity || 0
    })
    return scoreB - scoreA
  })
}
