export function safeNextRoute(value: string | null | undefined, fallback = '/swipe') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  try {
    const parsed = new URL(value, 'https://hungerswipes.invalid')
    return parsed.origin === 'https://hungerswipes.invalid' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback
  } catch {
    return fallback
  }
}
