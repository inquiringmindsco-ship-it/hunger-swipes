import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { hasValidImageSignature, validateImageMetadata } from '@/lib/upload-validation'

const BUCKET = 'dish-photos'

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const validation = validateImageMetadata(file.type, file.size)
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    // Ensure bucket exists (best-effort)
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find((b: any) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 })
    }

    const bytes = await file.arrayBuffer()
    if (!hasValidImageSignature(file.type, new Uint8Array(bytes))) {
      return NextResponse.json({ error: 'The file content does not match its image type' }, { status: 400 })
    }
    const ext = validation.extension
    const safeFolder = folder === 'seller-logos' ? 'seller-logos' : 'dish-photos'
    const path = `${user.id}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(data.path)
    return NextResponse.json({ url: publicUrl.publicUrl, path: data.path })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
