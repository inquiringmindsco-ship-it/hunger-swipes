import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

const RECIPE_PREVIEW_FIELDS = 'id,dish_id,seller_id,title,description,price,photo_url,status,published,created_at,updated_at'

function isHttpsUrl(url: string) {
  try { return new URL(url).protocol === 'https:' } catch { return false }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dishId = searchParams.get('dish_id')
    const sellerId = searchParams.get('seller_id')
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    let query = admin.from('recipes').select(RECIPE_PREVIEW_FIELDS).eq('status', 'active').eq('published', true)
    if (dishId) query = query.eq('dish_id', dishId)
    if (sellerId) query = query.eq('seller_id', sellerId)

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ recipes: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const {
      dish_id,
      title,
      description,
      ingredients,
      instructions,
      photo_url,
    } = body

    if (!dish_id || !title?.trim()) {
      return NextResponse.json({ error: 'dish_id and title are required' }, { status: 400 })
    }
    // Version 1 launches with free recipes only. Paid recipe commerce remains
    // server-disabled until the product is ready to expose that workflow.
    const priceNum = 0
    const type = 'free'

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    if (photo_url && !isHttpsUrl(photo_url)) {
      return NextResponse.json({ error: 'photo_url must be HTTPS' }, { status: 400 })
    }

    // Verify ownership of the dish/seller
    const { data: dish, error: dishError } = await admin
      .from('dishes')
      .select('id, seller_id, seller:sellers!inner(owner_user_id)')
      .eq('id', dish_id)
      .eq('sellers.owner_user_id', user.id)
      .maybeSingle()
    if (dishError) return NextResponse.json({ error: dishError.message }, { status: 500 })
    if (!dish) return NextResponse.json({ error: 'Dish not found or not yours' }, { status: 403 })

    // Do not allow duplicate live or pending recipes per dish.
    const { data: existing } = await admin
      .from('recipes')
      .select('id')
      .eq('dish_id', dish_id)
      .neq('status', 'removed')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'This dish already has a recipe awaiting review or published.' }, { status: 409 })
    }

    const insert: any = {
      dish_id,
      seller_id: dish.seller_id,
      creator_user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      price: priceNum,
      recipe_type: type,
      min_proud_to_pay_amount: null,
      ingredients: Array.isArray(ingredients) ? ingredients.map((s: string) => String(s).trim()).filter(Boolean) : [],
      instructions: Array.isArray(instructions) ? instructions.map((s: string) => String(s).trim()).filter(Boolean) : [],
      photo_url: photo_url || null,
      status: 'pending_review',
      published: false,
    }
    const { data, error } = await admin.from('recipes').insert(insert).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ recipe: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
