const RESERVED_ROUTES = new Set([
  'account', 'admin', 'api', 'auth', 'business', 'claim', 'creator', 'join',
  'leaderboard', 'matches', 'nearby', 'onboarding', 'places', 'post',
  'preferences', 'privacy', 'saved', 'seller', 'social', 'swipe', 'terms',
  'vendor', 'vendor-dashboard', 'vendor-intake', 'vendor-onepager', 'vendors',
  'verification', 'visits',
])

export function normalizeRestaurantSlug(value: unknown) {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function isAvailableRestaurantSlug(value: unknown) {
  const slug = normalizeRestaurantSlug(value)
  return slug.length >= 2 && !RESERVED_ROUTES.has(slug)
}
