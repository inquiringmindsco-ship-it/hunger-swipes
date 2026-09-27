import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  return secret === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('sellers')
      .select('*, dishes:dishes(id, name, status, availability)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sellers: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { sellerId, ownerEmail } = await request.json()
    if (!sellerId || !ownerEmail?.trim()) return NextResponse.json({ error: 'Seller and owner email are required' }, { status: 400 })
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })
    const owner = usersPage.users.find((user) => user.email?.toLowerCase() === ownerEmail.trim().toLowerCase())
    if (!owner) return NextResponse.json({ error: 'No Hunger Swipes account exists for that email yet' }, { status: 404 })

    const { data: alreadyOwned } = await admin.from('sellers').select('id,business_name').eq('owner_user_id', owner.id).neq('id', sellerId).limit(1).maybeSingle()
    if (alreadyOwned) return NextResponse.json({ error: `That account already manages ${alreadyOwned.business_name}` }, { status: 409 })

    const { data: seller, error } = await admin.from('sellers').update({ owner_user_id: owner.id }).eq('id', sellerId).select().maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    return NextResponse.json({ seller })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
