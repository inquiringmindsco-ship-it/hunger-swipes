import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'

const RESERVED = new Set([
  'api','admin','swipe','saved','account','auth','join','login','logout','profile','profiles','seller','sellers',
  'dishes','recipes','videos','images','static','_next','favicon','robots','sitemap','manifest','explore','eat','make',
  'stripe','connect','webhook','checkout','payment','payments','follows','impact','health','status','terms','privacy',
  'about','contact','support','help','blog','jobs','press','partners','affiliates','advertise','business','creator',
  'home','feed','discover','nearby','trending','popular','search','settings','notifications','messages','inbox','users'
])

const HANDLE_RE = /^[a-zA-Z0-9_]{2,32}$/

function normalizeHandle(handle: string): string | null {
  const trimmed = handle.trim().toLowerCase().replace(/^@/, '')
  if (!HANDLE_RE.test(trimmed)) return null
  if (RESERVED.has(trimmed)) return null
  return trimmed
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { handle: rawHandle, owner_type, owner_id } = body
    const ownerType = owner_type || 'user'
    const ownerId = owner_id || user.id

    if (ownerType === 'user' && ownerId !== user.id) {
      return NextResponse.json({ error: 'Cannot claim handle for another user' }, { status: 403 })
    }
    if (ownerType === 'seller') {
      const admin = getSupabaseAdmin()
      if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
      const { data: seller } = await admin.from('sellers').select('id').eq('id', ownerId).eq('owner_user_id', user.id).maybeSingle()
      if (!seller) return NextResponse.json({ error: 'Seller not found or not yours' }, { status: 403 })
    }

    const handle = normalizeHandle(rawHandle)
    if (!handle) return NextResponse.json({ error: 'Handle must be 2-32 letters, numbers, or underscores and not reserved' }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('handles')
      .insert({ handle, owner_type: ownerType, owner_id: ownerId })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Handle already taken' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ handle: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { handle: rawHandle, owner_type, owner_id } = body
    const ownerType = owner_type || 'user'
    const ownerId = owner_id || user.id

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const existing = await admin.from('handles').select('id').eq('owner_type', ownerType).eq('owner_id', ownerId).maybeSingle()
    if (!existing.data) return NextResponse.json({ error: 'No existing handle' }, { status: 404 })

    const handle = normalizeHandle(rawHandle)
    if (!handle) return NextResponse.json({ error: 'Invalid handle' }, { status: 400 })

    const { data, error } = await admin
      .from('handles')
      .update({ handle })
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Handle already taken' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ handle: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    const { searchParams } = new URL(request.url)
    const handle = searchParams.get('handle')?.toLowerCase().replace(/^@/, '')
    const ownerType = searchParams.get('owner_type')
    const ownerId = searchParams.get('owner_id')

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    if (handle) {
      const { data } = await admin.from('handles').select('*').eq('handle', handle).maybeSingle()
      return NextResponse.json({ handle: data })
    }
    if (ownerType && ownerId) {
      const { data } = await admin.from('handles').select('*').eq('owner_type', ownerType).eq('owner_id', ownerId).maybeSingle()
      return NextResponse.json({ handle: data })
    }
    if (user) {
      const userHandle = await admin.from('handles').select('*').eq('owner_type', 'user').eq('owner_id', user.id).maybeSingle()
      return NextResponse.json({ handle: userHandle.data })
    }
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
