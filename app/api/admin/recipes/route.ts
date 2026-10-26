import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('recipes')
      .select('*, dish:dishes(id,name,photo_url,status,seller_id,seller:sellers(id,business_name,status,verification_status))')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ recipes: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const allowed = ['status', 'published']
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { data: current, error: currentError } = await admin
      .from('recipes')
      .select('id,dish_id,dish:dishes(id,seller_id)')
      .eq('id', id)
      .single()
    if (currentError || !current) return NextResponse.json({ error: currentError?.message || 'Recipe not found' }, { status: 404 })

    const { data, error } = await admin.from('recipes').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const linkedDish = Array.isArray(current.dish) ? current.dish[0] : current.dish

    // A recipe submission is one reviewable bundle: creator profile, finished-food
    // card, and recipe. Explicit bundle review prevents a creator from passing one
    // hidden approval only to remain absent from MAKE behind a second approval.
    if (body.reviewBundle === true && linkedDish?.seller_id) {
      if (data.status === 'active' && data.published) {
        const { error: sellerError } = await admin.from('sellers').update({
          status: 'active',
          verification_status: 'approved',
          suspension_reason: null,
        }).eq('id', linkedDish.seller_id)
        if (sellerError) return NextResponse.json({ error: sellerError.message }, { status: 500 })
      } else if (data.status === 'removed') {
        const { error: dishRemovalError } = await admin.from('dishes').update({
          status: 'removed',
          availability: 'unavailable',
          recipe_available: false,
          recipe_access_type: 'none',
          recipe_price: 0,
        }).eq('id', data.dish_id)
        if (dishRemovalError) return NextResponse.json({ error: dishRemovalError.message }, { status: 500 })
      }
    }

    // Sync dish recipe flags
    if (data.status === 'active' && data.published) {
      await admin.from('dishes').update({
        ...(body.reviewBundle === true ? { status: 'active', availability: 'available' } : {}),
        recipe_available: true,
        recipe_access_type: data.price === 0 ? 'preview' : 'purchase',
        recipe_price: data.price,
        recipe_id: data.id,
      }).eq('id', data.dish_id)
    } else {
      await admin.from('dishes').update({ recipe_available: false, recipe_access_type: 'none', recipe_price: 0 }).eq('id', data.dish_id)
    }

    return NextResponse.json({ recipe: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
