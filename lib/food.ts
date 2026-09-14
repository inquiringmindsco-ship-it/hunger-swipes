export const CONTENT_KINDS = ['official', 'community'] as const
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
    creator_name: post.creator_name,
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
