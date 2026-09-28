import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const followingType = searchParams.get('following_type')
    const followingId = searchParams.get('following_id')

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    if (followingType && followingId) {
      const { data } = await admin
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_type', followingType)
        .eq('following_id', followingId)
        .maybeSingle()
      return NextResponse.json({ following: Boolean(data) })
    }

    const { data: following } = await admin
      .from('user_follows')
      .select('*')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
    return NextResponse.json({ following: following || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { following_type, following_id } = body
    if (!following_type || !following_id || !['user','seller'].includes(following_type)) {
      return NextResponse.json({ error: 'following_type and following_id required' }, { status: 400 })
    }
    if (following_type === 'user' && following_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('user_follows')
      .insert({ follower_id: user.id, following_type, following_id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Record private impact signal
    await admin.rpc('record_food_impact_event', {
      p_actor_id: user.id,
      p_event_type: 'follow',
      p_seller_id: following_type === 'seller' ? following_id : null,
      p_metadata: { following_type, following_id },
    })

    return NextResponse.json({ follow: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const followingType = searchParams.get('following_type')
    const followingId = searchParams.get('following_id')
    if (!followingType || !followingId) {
      return NextResponse.json({ error: 'following_type and following_id required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { error } = await admin
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_type', followingType)
      .eq('following_id', followingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
