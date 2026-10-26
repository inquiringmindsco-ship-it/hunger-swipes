export function safeNextRoute(value: string | null | undefined, fallback = '/swipe') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  try {
    const parsed = new URL(value, 'https://hungerswipes.invalid')
    return parsed.origin === 'https://hungerswipes.invalid' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback
  } catch {
    return fallback
  }
}

export function authValueCopy(nextRoute: string) {
  const pathname = safeNextRoute(nextRoute).split('?')[0]
  if (pathname === '/saved') return {
    title: 'Keep every dish you want',
    body: 'Sign in to save food you love and find it again when you’re ready to eat.',
  }
  if (pathname === '/history') return {
    title: 'Remember every swipe',
    body: 'Sign in to revisit food you passed or wanted and pick up where you left off.',
  }
  if (pathname === '/post') return {
    title: 'Share a dish worth finding',
    body: 'Sign in to post food from real places and help other people discover it.',
  }
  if (pathname === '/join' || pathname.startsWith('/seller')) return {
    title: 'Put your food in front of hungry people',
    body: 'Sign in to list your food, manage your seller profile, and reach local diners.',
  }
  if (pathname === '/account') return {
    title: 'Make Hunger Swipes yours',
    body: 'Sign in to save dishes, set preferences, post food, and manage your profile.',
  }
  return {
    title: 'Welcome back',
    body: 'Sign in to save food, remember your swipes, and manage your listings.',
  }
}
