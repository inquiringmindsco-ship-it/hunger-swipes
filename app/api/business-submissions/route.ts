import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isHttpsUrl } from '@/lib/food'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business_name, contact_name, phone, email, address, website, notes } = body
    if (![business_name, contact_name, phone, email, address].every((value) => typeof value === 'string' && value.trim())) {
      return NextResponse.json({ error: 'Business name, contact name, phone, email, and address are required' }, { status: 400 })
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    if (website?.trim() && !isHttpsUrl(website.trim())) return NextResponse.json({ error: 'Website or social link must use HTTPS' }, { status: 400 })
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data, error } = await admin
      .from('business_submissions')
      .insert({
        business_name: business_name.trim(),
        contact_name: contact_name?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        website: website?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ submission: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
