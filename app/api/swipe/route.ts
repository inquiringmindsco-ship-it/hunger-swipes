import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

const PREFERENCES_KEY = 'hungerswipes_preferences'

export async function POST(request: NextRequest) {
  try {
    const { photoId, direction, eaterId } = await request.json()

    if (!photoId || !direction || !eaterId) {
      return NextResponse.json(
        { error: 'Missing required fields: photoId, direction, eaterId' },
        { status: 400 }
      )
    }

    if (!['left', 'right', 'up'].includes(direction)) {
      return NextResponse.json(
        { error: 'Invalid direction. Must be left, right, or up' },
        { status: 400 }
      )
    }

    // Detect mock mode: if Supabase is configured but we're using mock IDs
    const isMockMode = !isSupabaseConfigured() || photoId.startsWith('mock-')

    if (isMockMode) {
      return NextResponse.json({
        success: true,
        mock: true,
        direction,
        photoId,
        preferencesUpdate: direction === 'right' || direction === 'up' ? {
          learned: true,
          message: 'Preferences updated based on your selection'
        } : null
      })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        mock: true,
        direction,
        photoId
      })
    }

    const { data: swipe, error: swipeError } = await (supabase as any)
      .from('swipes')
      .insert({
        eater_id: eaterId,
        photo_id: photoId,
        direction
      })
      .select()
      .single()

    if (swipeError) {
      if (swipeError.code === '23505') {
        return NextResponse.json(
          { error: 'Already swiped on this photo' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: swipeError.message }, { status: 500 })
    }

    let match = null
    let preferencesUpdate = null
    
    if (direction === 'right' || direction === 'up') {
      const { data: matchData, error: matchError } = await (supabase as any)
        .from('matches')
        .insert({
          eater_id: eaterId,
          photo_id: photoId
        })
        .select()
        .single()

      if (!matchError) match = matchData
      
      const { data: photo } = await (supabase as any)
        .from('photos')
        .select('tags, dietary_tags, cuisine_tags, spice_level, health_category')
        .eq('id', photoId)
        .single()
      
      if (photo) {
        const currentPrefs = await getEaterPreferences(eaterId)
        const updatedPrefs = learnFromSwipe(currentPrefs, photo, direction === 'up')
        await saveEaterPreferences(eaterId, updatedPrefs)
        
        preferencesUpdate = {
          learned: true,
          changes: getPreferenceChanges(currentPrefs, updatedPrefs)
        }
      }
    }

    const { data: updatedPhoto } = await (supabase as any)
      .from('photos')
      .select('hunger_score, swipes_total, swipes_right, super_hungers, completeness_score, viral_score')
      .eq('id', photoId)
      .single()

    return NextResponse.json({
      success: true,
      swipe,
      match,
      photo: updatedPhoto,
      preferencesUpdate
    })

  } catch (error) {
    console.error('Swipe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eaterId = searchParams.get('eaterId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ photos: getMockPhotos(), mock: true })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ photos: getMockPhotos(), mock: true })
    }

    const { data: swipedPhotoIds } = await (supabase as any)
      .from('swipes')
      .select('photo_id')
      .eq('eater_id', eaterId)

    const swipedIds = swipedPhotoIds?.map((s: any) => s.photo_id) || []

    let query = (supabase as any)
      .from('photos')
      .select(`
        id,
        image_url,
        thumbnail_url,
        title,
        description,
        dish_name,
        restaurant_name,
        restaurant_location,
        location_text,
        cuisine_type,
        cuisine_tags,
        price_range,
        price,
        commission_rate,
        hunger_score,
        completeness_score,
        metadata_quality_status,
        tags,
        dietary_tags,
        calories,
        spice_level,
        portion_size,
        vegetarian_option,
        vegan_option,
        gluten_free_option,
        health_category,
        viral_score,
        content_label,
        created_at,
        creator:profiles!creator_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('status', 'active')
      .order('hunger_score', { ascending: false })
      .limit(limit)

    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`)
    }

    const { data: photos, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ photos: photos || [] })

  } catch (error) {
    console.error('Get photos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface EaterPrefs {
  dietaryRestrictions: string[]
  favoriteCuisines: string[]
  priceRange: string[]
  spicePreference: number
  healthFocus: string[]
  excludeIngredients: string[]
}

async function getEaterPreferences(eaterId: string): Promise<EaterPrefs> {
  const key = `${PREFERENCES_KEY}_${eaterId}`
  if (typeof window === 'undefined') {
    return { dietaryRestrictions: [], favoriteCuisines: [], priceRange: ['$', '$$', '$$$', '$$$$'], spicePreference: 3, healthFocus: [], excludeIngredients: [] }
  }
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : { dietaryRestrictions: [], favoriteCuisines: [], priceRange: ['$', '$$', '$$$', '$$$$'], spicePreference: 3, healthFocus: [], excludeIngredients: [] }
  } catch {
    return { dietaryRestrictions: [], favoriteCuisines: [], priceRange: ['$', '$$', '$$$', '$$$$'], spicePreference: 3, healthFocus: [], excludeIngredients: [] }
  }
}

async function saveEaterPreferences(eaterId: string, prefs: EaterPrefs): Promise<void> {
  const key = `${PREFERENCES_KEY}_${eaterId}`
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(prefs))
  }
}

function learnFromSwipe(currentPrefs: EaterPrefs, photo: any, isSuper: boolean): EaterPrefs {
  const multiplier = isSuper ? 2 : 1
  const newPrefs = { ...currentPrefs }
  
  if (photo.dietary_tags && photo.dietary_tags.length > 0) {
    const combined = [...newPrefs.dietaryRestrictions, ...photo.dietary_tags]
    const unique = combined.filter((v, i, a) => a.indexOf(v) === i)
    newPrefs.dietaryRestrictions = unique.slice(0, 5)
  }
  
  if (photo.cuisine_tags && photo.cuisine_tags.length > 0) {
    const combined = [...newPrefs.favoriteCuisines, ...photo.cuisine_tags]
    const unique = combined.filter((v, i, a) => a.indexOf(v) === i)
    newPrefs.favoriteCuisines = unique.slice(0, 5)
  }
  
  if (photo.spice_level) {
    newPrefs.spicePreference = Math.round((newPrefs.spicePreference + photo.spice_level * multiplier) / (1 + multiplier))
    newPrefs.spicePreference = Math.max(1, Math.min(5, newPrefs.spicePreference))
  }
  
  if (photo.health_category && !newPrefs.healthFocus.includes(photo.health_category)) {
    newPrefs.healthFocus = [...newPrefs.healthFocus, photo.health_category].slice(0, 3)
  }
  
  return newPrefs
}

function getPreferenceChanges(oldPrefs: EaterPrefs, newPrefs: EaterPrefs): string[] {
  const changes: string[] = []
  
  if (newPrefs.dietaryRestrictions.length > oldPrefs.dietaryRestrictions.length) {
    const newItems = newPrefs.dietaryRestrictions.filter(d => !oldPrefs.dietaryRestrictions.includes(d))
    if (newItems.length > 0) changes.push(`Added dietary: ${newItems.join(', ')}`)
  }
  
  if (newPrefs.favoriteCuisines.length > oldPrefs.favoriteCuisines.length) {
    const newItems = newPrefs.favoriteCuisines.filter(c => !oldPrefs.favoriteCuisines.includes(c))
    if (newItems.length > 0) changes.push(`Added cuisine: ${newItems.join(', ')}`)
  }
  
  if (newPrefs.spicePreference !== oldPrefs.spicePreference) {
    changes.push(`Spice preference updated to ${newPrefs.spicePreference}`)
  }
  
  if (newPrefs.healthFocus.length > oldPrefs.healthFocus.length) {
    const newItems = newPrefs.healthFocus.filter(h => !oldPrefs.healthFocus.includes(h))
    if (newItems.length > 0) changes.push(`Added health focus: ${newItems.join(', ')}`)
  }
  
  return changes
}

function getMockPhotos() {
  return [
    { id: 'mock-1', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=800&fit=crop', dish_name: 'Margherita Pizza', restaurant_name: 'Pizzeria Locale', cuisine_type: 'Italian', price_range: '$$', commission_rate: 0.10, hunger_score: 94, creator: { username: '@stlfoodie' } },
    { id: 'mock-2', image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=800&fit=crop', dish_name: 'Acai Bowl', restaurant_name: 'Green Bowl', cuisine_type: 'Healthy', price_range: '$$', commission_rate: 0.12, hunger_score: 89, creator: { username: '@healthyeats' } },
    { id: 'mock-3', image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop', dish_name: 'Brisket Platter', restaurant_name: 'Smoke & Fire BBQ', cuisine_type: 'BBQ', price_range: '$$$', commission_rate: 0.10, hunger_score: 97, creator: { username: '@meatlovers_mike' } }
  ]
}
