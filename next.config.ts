import type { NextConfig } from 'next'

const configuredSupabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname }
  catch { return '' }
})()

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [72, 82, 84],
    deviceSizes: [320, 360, 390, 430, 640, 768, 1024, 1280],
    imageSizes: [64, 96, 128, 256],
    minimumCacheTTL: 86400,
    remotePatterns: configuredSupabaseHost ? [
      {
        protocol: 'https',
        hostname: configuredSupabaseHost,
        pathname: '/storage/v1/object/public/dish-photos/**',
      },
    ] : [],
  },
  async headers() {
    return [{
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
      ],
    }]
  },
}

export default nextConfig
