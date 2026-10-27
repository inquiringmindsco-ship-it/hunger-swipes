export const CONTENT_KINDS = ['official', 'community', 'place_staging'] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]

export function normalizeContentKind(value: unknown): ContentKind | null {
  return typeof value === 'string' && CONTENT_KINDS.includes(value as ContentKind)
    ? value as ContentKind
    : null
}

export function boundedLimit(value: string | null, fallback = 20, maximum = 100) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, maximum)) : fallback
}

export function formatOptionalFoodPrice(value: unknown) {
  const price = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(price) && price > 0 ? `$${price.toFixed(2)}` : null
}

const FOOD_FAMILIES: Array<[string, RegExp]> = [
  ['pizza', /\b(pizza|pepperoni|calzone)\b/],
  ['burger', /\b(burger|cheeseburger|hamburger|slider)\b/],
  ['taco', /\b(taco|tacos|quesadilla|nachos)\b/],
  ['burrito', /\b(burrito|chimichanga)\b/],
  ['wings', /\b(wing|wings|buffalo)\b/],
  ['sandwich', /\b(sandwich|sub|hoagie|panini|wrap)\b/],
  ['bbq', /\b(bbq|barbecue|brisket|ribs|pulled pork)\b/],
  ['chicken', /\b(chicken|tenders|fried chicken)\b/],
  ['seafood', /\b(fish|shrimp|salmon|seafood|crab|lobster)\b/],
  ['pasta', /\b(pasta|spaghetti|lasagna|alfredo|mac and cheese|macaroni)\b/],
  ['noodles', /\b(noodle|noodles|ramen|pho)\b/],
  ['salad', /\b(salad|greens)\b/],
  ['soup', /\b(soup|stew|chili)\b/],
  ['breakfast', /\b(breakfast|pancake|waffle|omelet|omelette|french toast)\b/],
  ['dessert', /\b(dessert|cake|cookie|brownie|pie|ice cream|donut|doughnut)\b/],
]

export function foodVarietyKey(item: any): string {
  const text = [item?.name, item?.category, ...(Array.isArray(item?.tags) ? item.tags : [])]
    .filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const family = FOOD_FAMILIES.find(([, pattern]) => pattern.test(text))
  if (family) return family[0]
  return text.split(/\s+/).filter((token) => token.length > 2 && !['the', 'and', 'with', 'plate', 'combo', 'special'].includes(token)).slice(0, 2).join('-') || 'food'
}

/** Keep similar dishes and the same seller apart when alternatives exist. */
export function diversifyFoodOrder<T extends { seller?: { id?: string } }>(items: T[]): T[] {
  const remaining = [...items]
  const result: T[] = []
  while (remaining.length) {
    const previous = result[result.length - 1]
    if (!previous) { result.push(remaining.shift()!); continue }
    const previousKey = foodVarietyKey(previous)
    const previousSeller = previous.seller?.id || ''
    let index = remaining.findIndex((item) => foodVarietyKey(item) !== previousKey && (!previousSeller || item.seller?.id !== previousSeller))
    if (index < 0) index = remaining.findIndex((item) => foodVarietyKey(item) !== previousKey)
    if (index < 0) index = remaining.findIndex((item) => !previousSeller || item.seller?.id !== previousSeller)
    if (index < 0) index = 0
    result.push(remaining.splice(index, 1)[0])
  }
  return result
}

/**
 * Build one Discover deck page deterministically (pure, side-effect free).
 * - excludedKeys: cards hidden for THIS session (client-pass exclusions only)
 * - seenKeys: historical swipes — they no longer hide anything; unseen cards lead,
 *   seen cards follow, so a fresh session replays the full eligible catalog
 * - replay: new-session mode; ignores seen/unseen ordering and diversifies across all
 * The builder mutates nothing and never drops history: visibility is a read-time rule.
 */
export function buildDiscoverDeck<T extends { content_kind: string; id: string }>(
  items: T[],
  opts: { excludedKeys: Set<string>; seenKeys: Set<string>; replay: boolean; sort: (a: T, b: T) => number },
): T[] {
  const keyOf = (item: T) => `${item.content_kind}:${item.id}`
  const seenIds = new Set<string>()
  const visible = items.filter((item) => {
    const k = keyOf(item)
    if (opts.excludedKeys.has(k) || seenIds.has(k)) return false
    seenIds.add(k)
    return true
  })
  const ranked = visible.slice().sort((a, b) => {
    if (!opts.replay) {
      const aSeen = opts.seenKeys.has(keyOf(a)) ? 1 : 0
      const bSeen = opts.seenKeys.has(keyOf(b)) ? 1 : 0
      if (aSeen !== bSeen) return aSeen - bSeen
    }
    return opts.sort(a, b)
  })
  if (opts.replay) return diversifyFoodOrder(ranked as any) as T[]
  const unseen = ranked.filter((item) => !opts.seenKeys.has(keyOf(item)))
  const seen = ranked.filter((item) => opts.seenKeys.has(keyOf(item)))
  return [...diversifyFoodOrder(unseen as any), ...diversifyFoodOrder(seen as any)] as T[]
}

export function isHttpsUrl(value: unknown) {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function isManagedPhotoUrl(value: unknown) {
  if (!isHttpsUrl(value)) return false
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  try {
    const url = new URL(value as string)
    const expected = new URL(supabaseUrl)
    return url.origin === expected.origin && url.pathname.startsWith('/storage/v1/object/public/dish-photos/')
  } catch {
    return false
  }
}

export function isOwnedManagedPhotoUrl(value: unknown, userId: string) {
  if (!isManagedPhotoUrl(value)) return false
  try {
    const url = new URL(value as string)
    const prefix = `/storage/v1/object/public/dish-photos/${encodeURIComponent(userId)}/`
    return url.pathname.startsWith(prefix)
  } catch {
    return false
  }
}

export function mapPlaceStagingCard(place: any, candidate: any) {
  return {
    id: place.id,
    content_kind: 'place_staging' as const,
    name: candidate?.dish_name || `Menu favorites at ${place.name}`,
    description: `Starter food from ${place.name}`,
    photo_url: place.temporary_staging_place_image_url,
    price: null,
    category: place.cuisine || place.category || 'Food',
    tags: place.cuisine ? [place.cuisine] : [],
    impressions: 0,
    right_swipes: 0,
    left_swipes: 0,
    created_at: place.created_at,
    status: 'active',
    moderation_status: 'approved',
    seller: {
      id: place.id,
      business_name: place.name,
      seller_type: 'restaurant',
      location_text: place.location_text || '',
      address: place.address || null,
      city: place.city || null,
      state: place.state || null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      phone: place.phone || null,
      hours_text: place.hours || null,
      website: place.website || null,
      order_url: place.order_url || null,
      ordering_url: place.order_url || null,
      ordering_method: 'none',
      status: 'active',
      verification_status: 'community',
    },
  }
}

export function mapCommunityPost(post: any) {
  return {
    id: post.id,
    content_kind: 'community' as const,
    name: post.dish_name,
    description: post.description,
    photo_url: post.photo_url,
    price: post.price,
    category: post.category,
    tags: post.tags || [],
    impressions: post.impressions || 0,
    right_swipes: post.right_swipes || 0,
    left_swipes: post.left_swipes || 0,
    created_at: post.created_at,
    status: post.status,
    moderation_status: post.moderation_status,
    moderation_reason: post.moderation_reason,
    creator_name: post.creator_name,
    creator_user_id: post.user_id,
    seller: {
      id: post.place?.id,
      business_name: post.place?.name || 'Community place',
      seller_type: 'community',
      location_text: post.place?.location_text || '',
      address: post.place?.address || null,
      city: post.place?.city || null,
      state: post.place?.state || null,
      latitude: post.place?.latitude ?? null,
      longitude: post.place?.longitude ?? null,
      phone: post.place?.phone || null,
      hours_text: post.place?.hours || null,
      website: post.place?.website || null,
      order_url: post.place?.order_url || null,
      ordering_url: post.place?.order_url || null,
      ordering_method: 'none',
      status: 'active',
      verification_status: 'community',
    },
  }
}

export function mapOfficialDish(dish: any) {
  return { ...dish, content_kind: 'official' as const }
}
