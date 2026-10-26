import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/server-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Account deletion endpoint.
 * Deletes the authenticated Supabase auth user and anonymizes related records.
 * This endpoint is intentionally strict: it only acts on the currently authenticated user.
 */
export async function DELETE(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // Anonymize profile data before deleting the auth record so any FK cascades
    // leave behind minimal personal information.
    await admin
      .from('profiles')
      .update({ full_name: null, username: null, email: null, avatar_url: null, bio: null, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    await admin
      .from('community_food_posts')
      .update({ user_id: null, username: 'deleted-user', status: 'deleted', moderation_status: 'removed' })
      .eq('user_id', user.id)

    // Delete the auth user. Related rows with ON DELETE CASCADE will be removed.
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('Failed to delete user:', error)
      return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: err.message || 'Account deletion failed' }, { status: 500 })
  }
}
