import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/food-intake/gaps
 *
 * Returns active places that have no dishes and no image candidates, optionally
 * filtered by city. This helps admins find content gaps to fill.
 */
export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const params = new URL(request.url).searchParams
  const city = params.get('city')?.trim().slice(0, 120)

  try {
    let query = admin
      .from('places')
      .select('id,name,location_text,address,city,state,postal_code,country,category,cuisine')
      .eq('status', 'active')
      .limit(200)

    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    const { data: places, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const placeIds = (places || []).map((p: any) => p.id)
    if (placeIds.length === 0) return NextResponse.json({ places: [] })

    const [{ data: dishRows }, { data: candidateRows }] = await Promise.all([
      admin.from('dishes').select('place_id').in('place_id', placeIds).neq('status', 'removed'),
      admin.from('place_image_candidates').select('place_id').in('place_id', placeIds),
    ])

    const placesWithDishes = new Set((dishRows || []).map((r: any) => r.place_id))
    const placesWithCandidates = new Set((candidateRows || []).map((r: any) => r.place_id))

    const gaps = (places || []).filter(
      (p: any) => !placesWithDishes.has(p.id) && !placesWithCandidates.has(p.id),
    )

    return NextResponse.json({ places: gaps })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
