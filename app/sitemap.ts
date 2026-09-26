import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = 'https://hungerswipes.com'
  return ['/swipe', '/nearby', '/join', '/post', '/privacy', '/terms'].map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/swipe' || path === '/nearby' ? 'daily' as const : 'monthly' as const,
    priority: path === '/swipe' ? 1 : 0.6,
  }))
}
