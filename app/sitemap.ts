import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = 'https://hungerswipes.com'
  const pages = [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/swipe', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/nearby', changeFrequency: 'daily' as const, priority: 0.7 },
    { path: '/join', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/privacy', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/terms', changeFrequency: 'monthly' as const, priority: 0.5 },
  ]
  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
