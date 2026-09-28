import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { deleteFoodMedia } from '@/lib/storage-cleanup'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const denied = checkAdmin(request)
  if (denied) return denied

  try {
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('food_media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ media: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const denied = checkAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const body = await request.json()
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const update: any = {}
    if (body.moderation_status) update.moderation_status = body.moderation_status
    if (body.moderation_reason !== undefined) update.moderation_reason = body.moderation_reason
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    const { data, error } = await admin.from('food_media').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ media: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const denied = checkAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await deleteFoodMedia(id, { force: true })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
