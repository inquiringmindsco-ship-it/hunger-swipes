import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getAdminPrincipal } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const principal = await getAdminPrincipal(request)
  if (!principal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { targetType, targetId, action, reason } = body
    if (!['seller', 'dish'].includes(targetType) || !targetId || !['activate', 'suspend', 'remove', 'restore', 'approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid targetType or action' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    let newStatus = ''
    let newVerification = ''
    if (targetType === 'seller') {
      if (action === 'approve') {
        // Verify seller readiness before activation.
        const { data: seller } = await admin.from('sellers').select('business_name,contact_name,contact_email,address,location_text,ordering_method,ordering_url,phone,pickup_available,delivery_available').eq('id', targetId).single()
        if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
        const missing = []
        if (!seller.business_name?.trim()) missing.push('business name')
        if (!seller.contact_name?.trim()) missing.push('contact name')
        if (!seller.contact_email?.trim()) missing.push('contact email')
        if (!seller.address?.trim()) missing.push('address')
        if (!seller.location_text?.trim()) missing.push('location')
        const orderingMethod = seller.ordering_method || 'none'
        const hasOrderingUrl = orderingMethod === 'link' && seller.ordering_url?.trim()
        const hasPhone = orderingMethod === 'phone' && seller.phone?.trim()
        const hasInApp = orderingMethod === 'in_app'
        const orderingReady = orderingMethod !== 'none' && (hasOrderingUrl || hasPhone || hasInApp)
        if (!orderingReady) missing.push('ordering method (phone or link)')
        const offersFulfillment = seller.pickup_available || seller.delivery_available
        if (offersFulfillment && !orderingReady) missing.push('pickup/delivery requires an ordering phone or link')
        if (missing.length) return NextResponse.json({ error: `Seller not ready: ${missing.join(', ')}` }, { status: 400 })
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
      admin_id: principal.userId,
    })

    return NextResponse.json({ success: true, targetType, targetId, newStatus })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
