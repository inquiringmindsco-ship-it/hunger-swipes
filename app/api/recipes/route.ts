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
      price,
      recipe_type,
      min_proud_to_pay_amount,
      ingredients,
      instructions,
      photo_url,
      video_media_id,
      published,
    } = body

    if (!dish_id || !title?.trim()) {
      return NextResponse.json({ error: 'dish_id and title are required' }, { status: 400 })
    }
    const priceNum = parseFloat(price ?? '0')
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: 'price must be 0 or more' }, { status: 400 })
    }

    const type = recipe_type || (priceNum === 0 ? 'free' : 'fixed_price')
    if (!['free','fixed_price','proud_to_pay'].includes(type)) {
      return NextResponse.json({ error: 'Invalid recipe_type' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    // Centralized commerce config
    const { data: minFixed } = await admin.from('recipe_commerce_config').select('value').eq('key', 'fixed_price_minimum').maybeSingle()
    const { data: minProud } = await admin.from('recipe_commerce_config').select('value').eq('key', 'proud_to_pay_minimum').maybeSingle()
    const fixedMin = Number(minFixed?.value?.amount ?? 4.99)
    const proudMin = Number(minProud?.value?.amount ?? 5.00)

    if (type === 'free' && priceNum !== 0) {
      return NextResponse.json({ error: 'Free recipes must have price 0' }, { status: 400 })
    }
    if (type === 'fixed_price' && priceNum < fixedMin) {
      return NextResponse.json({ error: `Fixed-price recipes must be at least $${fixedMin.toFixed(2)}` }, { status: 400 })
    }
    if (type === 'proud_to_pay' && priceNum < proudMin) {
      return NextResponse.json({ error: `Proud to Pay minimum is $${proudMin.toFixed(2)}` }, { status: 400 })
    }
    const minProudNum = type === 'proud_to_pay' ? Math.max(parseFloat(min_proud_to_pay_amount ?? '0') || proudMin, proudMin) : null

    if (photo_url && !isHttpsUrl(photo_url)) {
      return NextResponse.json({ error: 'photo_url must be HTTPS' }, { status: 400 })
    }

    // Verify ownership of the dish/seller
    const { data: dish, error: dishError } = await admin
      .from('dishes')
      .select('id, seller_id, seller:sellers!inner(owner_user_id, stripe_account_id, stripe_connect_status)')
      .eq('id', dish_id)
      .eq('sellers.owner_user_id', user.id)
      .maybeSingle()
    if (dishError) return NextResponse.json({ error: dishError.message }, { status: 500 })
    if (!dish) return NextResponse.json({ error: 'Dish not found or not yours' }, { status: 403 })

    // Do not allow duplicate active recipe per dish
    const { data: existing } = await admin
      .from('recipes')
      .select('id')
      .eq('dish_id', dish_id)
      .eq('status', 'active')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'This dish already has an active recipe. Edit it instead.' }, { status: 409 })
    }

    const insert: any = {
      dish_id,
      seller_id: dish.seller_id,
      creator_user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      price: priceNum,
      recipe_type: type,
      min_proud_to_pay_amount: minProudNum,
      ingredients: Array.isArray(ingredients) ? ingredients.map((s: string) => String(s).trim()).filter(Boolean) : [],
      instructions: Array.isArray(instructions) ? instructions.map((s: string) => String(s).trim()).filter(Boolean) : [],
      photo_url: photo_url || null,
      status: 'active',
      published: !!published,
    }
    if (video_media_id) insert.video_media_id = video_media_id

    const { data, error } = await admin.from('recipes').insert(insert).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update dish flags so the feed can surface recipe availability
    await admin.from('dishes').update({
      recipe_available: true,
      recipe_access_type: type === 'free' ? 'preview' : 'purchase',
      recipe_price: priceNum,
      recipe_id: data.id,
    }).eq('id', dish_id)

    return NextResponse.json({ recipe: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
