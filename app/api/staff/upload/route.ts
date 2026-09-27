import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyStaffToken, COOKIE_NAME } from '@/lib/staff-auth'
import { validateImageMetadata, hasValidImageSignature } from '@/lib/upload-validation'

const BUCKET = 'dish-photos'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value
    const payload = verifyStaffToken(token)
    if (!payload) return NextResponse.json({ error: 'Staff session expired or invalid' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const validation = validateImageMetadata(file.type, file.size)
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find((b: any) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 })
    }

    const bytes = await file.arrayBuffer()
    if (!hasValidImageSignature(file.type, new Uint8Array(bytes))) {
      return NextResponse.json({ error: 'The file content does not match its image type' }, { status: 400 })
    }

    const ext = validation.extension
    const path = `staff/${payload.seller_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(data.path)
    return NextResponse.json({ url: publicUrl.publicUrl, path: data.path }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
