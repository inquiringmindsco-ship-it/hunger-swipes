import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/dishes'],
      disallow: [
        '/admin',
        '/api/',
        '/account',
        '/saved',
        '/post',
        '/matches',
        '/preferences',
        '/onboarding',
        '/auth',
        '/claim',
        '/creator',
        '/seller',
        '/vendor',
        '/vendor-dashboard',
        '/vendor-intake',
        '/vendor-onepager',
        '/visits',
        '/social',
      ],
    },
    sitemap: 'https://hungerswipes.com/sitemap.xml',
    host: 'https://hungerswipes.com',
  }
}
