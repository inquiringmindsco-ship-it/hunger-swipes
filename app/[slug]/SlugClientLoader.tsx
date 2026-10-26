'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RestaurantClient, { Restaurant, Dish } from './RestaurantClient'
import FoodProfileClient from '@/app/components/FoodProfileClient'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { apiFetch } from '@/lib/auth-fetch'

interface ProfilePayload {
  handle: string
  owner_type: 'user' | 'seller'
  profile?: any
  entity?: any
  dishes?: any[]
  recipes?: any[]
  private?: {
    follower_count?: number | null
    following_count?: number | null
    is_following?: boolean | null
  }
}

function normalizeForClient(data: any): ProfilePayload {
  return {
    handle: data.handle,
    owner_type: data.owner_type,
    profile: data.profile,
    entity: data.entity,
    dishes: data.dishes || [],
    recipes: data.recipes || [],
    private: data.private,
  }
}

export default function SlugClientLoader() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const normalized = slug.trim().toLowerCase().replace(/^@/, '')

  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState<{ restaurant: Restaurant; dishes: Dish[] } | null>(null)
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!normalized) {
      setLoading(false)
      setError('No slug provided')
      return
    }

    let cancelled = false

    async function load() {
      try {
        const res = await apiFetch(`/api/restaurants/${encodeURIComponent(normalized)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setRestaurant(data)
            setLoading(false)
          }
          return
        }
      } catch {
        // ignore and try profile
      }

      try {
        const res = await apiFetch(`/api/profiles/${encodeURIComponent(normalized)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setProfile(normalizeForClient(data))
            setLoading(false)
          }
          return
        }
      } catch {
        // ignore
      }

      if (!cancelled) {
        setError('Page not found')
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [normalized])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <LoadingState label="Loading…" />
      </div>
    )
  }

  if (restaurant) {
    return <RestaurantClient restaurant={restaurant.restaurant} dishes={restaurant.dishes} />
  }

  if (profile) {
    return <FoodProfileClient initialData={profile} />
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <EmptyState title="Not found" body={error || "We couldn't find that page."} />
    </div>
  )
}
