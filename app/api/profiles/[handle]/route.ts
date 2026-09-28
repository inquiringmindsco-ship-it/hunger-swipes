import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  try {
    const user = await getRequestUser(request)
    const { handle } = await params
    const normalized = handle.trim().toLowerCase().replace(/^@/, '')

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: handleRow } = await admin.from('handles').select('*').eq('handle', normalized).maybeSingle()
    if (!handleRow) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const isOwn = user && handleRow.owner_type === 'user' && handleRow.owner_id === user.id

    let profile: any = null
    let entity: any = null
    let dishes: any[] = []
    let recipes: any[] = []
    let followingCount = 0
    let followerCount = 0
    let isFollowing = false

    if (handleRow.owner_type === 'user') {
      const { data: p } = await admin.from('food_profiles').select('*').eq('owner_type', 'user').eq('owner_id', handleRow.owner_id).maybeSingle()
      profile = p
      entity = { id: handleRow.owner_id, email: null }
      // Public food contributions only: approved community posts with public profile-eligible flag
      const { data: posts } = await admin
        .from('community_food_posts')
        .select('id, dish_name, photo_url, created_at, right_swipes')
        .eq('user_id', handleRow.owner_id)
        .eq('status', 'active')
        .eq('moderation_status', 'approved')
        .eq('profile_eligible', true)
        .order('created_at', { ascending: false })
        .limit(20)
      dishes = posts || []
    } else if (handleRow.owner_type === 'seller') {
      const [{ data: p }, { data: s }] = await Promise.all([
        admin.from('food_profiles').select('*').eq('owner_type', 'seller').eq('owner_id', handleRow.owner_id).maybeSingle(),
        admin.from('sellers').select('*').eq('id', handleRow.owner_id).maybeSingle(),
      ])
      profile = p
      entity = s
      const { data: sd } = await admin
        .from('dishes')
        .select('id, name, photo_url, price, category, tags, recipe_available, created_at')
        .eq('seller_id', handleRow.owner_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)
      dishes = sd || []
      const { data: sr } = await admin
        .from('recipes')
        .select('id, dish_id, title, description, price, photo_url, recipe_type, published, status')
        .eq('seller_id', handleRow.owner_id)
        .eq('status', 'active')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(20)
      recipes = sr || []
    }

    // Follow counts are private; only the owner sees them. Public UI never displays follower count.
    if (isOwn) {
      const [{ count: fc }, { count: fgc }, { data: followingMe }] = await Promise.all([
        admin.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_type', handleRow.owner_type).eq('following_id', handleRow.owner_id),
        admin.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', handleRow.owner_id),
        user ? admin.from('user_follows').select('id').eq('follower_id', user.id).eq('following_type', handleRow.owner_type).eq('following_id', handleRow.owner_id).maybeSingle() : { data: null },
      ])
      followerCount = fc || 0
      followingCount = fgc || 0
      isFollowing = Boolean(followingMe)
    }

    return NextResponse.json({
      handle: handleRow.handle,
      owner_type: handleRow.owner_type,
      owner_id: handleRow.owner_id,
      profile,
      entity: handleRow.owner_type === 'seller' ? entity : { id: entity.id },
      dishes,
      recipes,
      private: {
        // Only returned for the owner; never displayed publicly
        follower_count: isOwn ? followerCount : null,
        following_count: isOwn ? followingCount : null,
        is_following: isOwn ? isFollowing : null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
