import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret') || ''
  return secret === process.env.ADMIN_SECRET
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { targetType, targetId, action, reason, adminId } = body
    if (!['seller', 'dish'].includes(targetType) || !targetId || !['activate', 'suspend', 'remove', 'restore', 'approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid targetType or action' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    let newStatus = ''
    let newVerification = ''
    if (targetType === 'seller') {
      if (action === 'approve') {
        newStatus = 'active'
        newVerification = 'approved'
      } else if (action === 'reject') {
        newVerification = 'rejected'
      } else {
        newStatus = action === 'suspend' ? 'suspended' : action === 'activate' ? 'active' : action === 'remove' ? 'suspended' : 'active'
      }
      const update: any = { suspension_reason: reason || null }
      if (newStatus) update.status = newStatus
      if (newVerification) update.verification_status = newVerification
      const { error } = await admin.from('sellers').update(update).eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      newStatus = action === 'suspend' || action === 'remove' ? 'removed' : 'active'
      const { error } = await admin
        .from('dishes')
        .update({ status: newStatus })
        .eq('id', targetId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await admin.from('admin_actions').insert({
      target_type: targetType,
      target_id: targetId,
      action,
      reason: reason || null,
      admin_id: adminId || null,
    })

    return NextResponse.json({ success: true, targetType, targetId, newStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
