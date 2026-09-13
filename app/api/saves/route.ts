import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eaterId = searchParams.get('eaterId')
    if (!eaterId) return NextResponse.json({ error: 'eaterId required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('saved_dishes')
      .select(`
        *,
        dish:dishes!inner(*, seller:sellers!inner(*))
      `)
      .eq('eater_id', eaterId)
      .eq('dish.status', 'active')
      .eq('dish.availability', 'available')
      .not('dish.photo_url', 'is', null)
      .neq('dish.photo_url', '')
      .eq('dish.seller.status', 'active')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eaterId = searchParams.get('eaterId')
    const dishId = searchParams.get('dishId')
    if (!eaterId || !dishId) return NextResponse.json({ error: 'eaterId and dishId required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { error } = await admin.from('saved_dishes').delete().eq('eater_id', eaterId).eq('dish_id', dishId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
