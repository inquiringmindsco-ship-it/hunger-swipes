import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

const RECIPE_PREVIEW_FIELDS = 'id,dish_id,seller_id,title,description,price,photo_url,status,published,created_at,updated_at'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'preview'
    const user = mode === 'unlock' ? await getRequestUser(request) : null

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: recipe, error } = await admin
      .from('recipes')
      .select('*')
      .eq('id', id)
      .in('status', ['active', 'removed'])
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!recipe || recipe.status !== 'active' || !recipe.published) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (mode === 'preview') {
      return NextResponse.json({
        recipe: {
          id: recipe.id,
          dish_id: recipe.dish_id,
          seller_id: recipe.seller_id,
          title: recipe.title,
          description: recipe.description,
          price: recipe.price,
          photo_url: recipe.photo_url,
          published: recipe.published,
          created_at: recipe.created_at,
        },
      })
    }

    if (!user) return NextResponse.json({ error: 'Authentication required to unlock' }, { status: 401 })

    // Free recipes auto-grant entitlement; paid recipes require existing entitlement.
    if (recipe.price > 0) {
      const { data: entitlement } = await admin
        .from('recipe_entitlements')
        .select('*')
        .eq('recipe_id', id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      if (!entitlement) {
        return NextResponse.json({ error: 'Purchase required', locked: true }, { status: 403 })
      }
    } else {
      await admin.from('recipe_entitlements').upsert({
        user_id: user.id,
        recipe_id: id,
        dish_id: recipe.dish_id,
        price_paid_cents: 0,
        status: 'active',
      }, { onConflict: 'user_id,recipe_id' })
    }

    return NextResponse.json({
      recipe: {
        id: recipe.id,
        dish_id: recipe.dish_id,
        seller_id: recipe.seller_id,
        title: recipe.title,
        description: recipe.description,
        price: recipe.price,
        photo_url: recipe.photo_url,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        published: recipe.published,
        created_at: recipe.created_at,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: existing, error: findError } = await admin
      .from('recipes')
      .select('*, dish:dishes!inner(seller_id, seller:sellers!inner(owner_user_id))')
      .eq('id', id)
      .maybeSingle()
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    const dishRow = existing.dish as any
    const ownerId = dishRow?.seller?.[0]?.owner_user_id
    if (ownerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const allowed = ['title', 'description', 'price', 'ingredients', 'instructions', 'photo_url', 'video_media_id', 'published']
    const update: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    if (update.price !== undefined && (isNaN(parseFloat(update.price)) || parseFloat(update.price) < 0)) {
      return NextResponse.json({ error: 'price must be 0 or more' }, { status: 400 })
    }

    const { data, error } = await admin.from('recipes').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sync dish flags
    await admin.from('dishes').update({
      recipe_available: true,
      recipe_access_type: data.price === 0 ? 'preview' : 'purchase',
      recipe_price: data.price,
    }).eq('id', data.dish_id)

    return NextResponse.json({ recipe: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { id } = await params

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: existing, error: findError } = await admin
      .from('recipes')
      .select('dish_id, dish:dishes!inner(seller_id, seller:sellers!inner(owner_user_id))')
      .eq('id', id)
      .maybeSingle()
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    const dishRow = existing.dish as any
    const ownerId = dishRow?.seller?.[0]?.owner_user_id
    if (ownerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await admin.from('recipes').update({ status: 'removed' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await admin.from('dishes').update({ recipe_available: false, recipe_access_type: 'none', recipe_price: 0 }).eq('id', existing.dish_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
