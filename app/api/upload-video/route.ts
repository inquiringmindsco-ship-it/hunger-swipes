import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRequestUser } from '@/lib/server-auth'
import { tempDir, probeVideo, transcodeForDelivery, extractFrames, cleanupDir, fileToDataUri, ffmpegAvailable } from '@/lib/video-service'
import { classifyFoodImage } from '@/lib/moderation'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const BUCKET = 'food-media'
const MAX_INCOMING_BYTES = 50 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-m4v',
  'video/mpeg',
])

export async function POST(request: NextRequest) {
  const tmpDir = await tempDir()
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const dishId = (formData.get('dish_id') as string) || null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Use an MP4, MOV, WebM, 3GP, or M4V video' }, { status: 400 })
    }
    if (file.size <= 0) return NextResponse.json({ error: 'The video is empty' }, { status: 400 })
    if (file.size > MAX_INCOMING_BYTES) {
      return NextResponse.json({ error: 'Videos must be 50 MB or smaller before processing' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1] || 'mp4'
    const uuid = crypto.randomUUID()
    const originalKey = `${user.id}/videos/original/${uuid}.${ext}`
    const optimizedKey = `${user.id}/videos/${uuid}-opt.mp4`
    const posterKey = `${user.id}/videos/${uuid}-poster.jpg`

    // Save to temp for probing/transcoding
    const inputPath = path.join(tmpDir, `input.${ext}`)
    const bytes = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(inputPath, bytes)

    // Validate duration
    const probe = await probeVideo(inputPath)
    if (!probe.hasVideoStream) {
      return NextResponse.json({ error: 'No video stream found' }, { status: 400 })
    }
    if (probe.duration > 10) {
      return NextResponse.json({ error: 'Videos must be 10 seconds or shorter' }, { status: 400 })
    }

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find((b: any) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 50 * 1024 * 1024 })
    }

    // Upload original
    const { data: originalUpload, error: originalError } = await admin.storage
      .from(BUCKET)
      .upload(originalKey, bytes, { contentType: file.type })
    if (originalError) return NextResponse.json({ error: originalError.message }, { status: 500 })

    const transcoded = ffmpegAvailable() ? await transcodeForDelivery(inputPath, tmpDir, uuid, 10) : null

    let optimizedKeyFinal = originalKey
    let posterKeyFinal: string | null = null
    let optimizedSize = bytes.length
    let width = probe.width
    let height = probe.height
    let duration = probe.duration
    let processingStatus: string = transcoded ? 'ready' : 'pending'
    let moderationStatus: 'pending_review' | 'approved' | 'rejected' = 'pending_review'
    let moderationReason: string | null = null

    if (transcoded) {
      const optBytes = await fs.readFile(transcoded.optimizedPath)
      const posterBytes = await fs.readFile(transcoded.posterPath)
      optimizedSize = optBytes.length
      width = transcoded.width
      height = transcoded.height
      duration = transcoded.duration

      const { error: optErr } = await admin.storage.from(BUCKET).upload(optimizedKey, optBytes, { contentType: 'video/mp4' })
      if (optErr) return NextResponse.json({ error: optErr.message }, { status: 500 })

      const { error: posterErr } = await admin.storage.from(BUCKET).upload(posterKey, posterBytes, { contentType: 'image/jpeg' })
      if (posterErr) return NextResponse.json({ error: posterErr.message }, { status: 500 })

      optimizedKeyFinal = optimizedKey
      posterKeyFinal = posterKey

      // Moderate representative frames
      try {
        const frames = await extractFrames(transcoded.optimizedPath, tmpDir, uuid, 3)
        const results = await Promise.all(frames.map(async (f) => classifyFoodImage(await fileToDataUri(f))))
        const rejected = results.some((r) => r.status === 'rejected')
        const allApproved = results.every((r) => r.status === 'approved')
        moderationStatus = rejected ? 'rejected' : allApproved ? 'approved' : 'pending_review'
        moderationReason = results.map((r, i) => `Frame ${i + 1}: ${r.status}`).join('; ')
      } catch (modErr: any) {
        moderationReason = `Moderation error: ${modErr.message}`
      }
    }

    const { data: publicOriginal } = admin.storage.from(BUCKET).getPublicUrl(originalKey)
    const { data: publicOptimized } = admin.storage.from(BUCKET).getPublicUrl(optimizedKeyFinal)
    const { data: publicPoster } = posterKeyFinal ? admin.storage.from(BUCKET).getPublicUrl(posterKeyFinal) : { data: null }

    const { data: mediaRow, error: insertError } = await admin
      .from('food_media')
      .insert({
        owner_id: user.id,
        dish_id: dishId,
        kind: 'video',
        original_path: originalKey,
        optimized_path: optimizedKeyFinal,
        thumbnail_path: posterKeyFinal,
        duration_seconds: duration,
        original_size_bytes: bytes.length,
        optimized_size_bytes: optimizedSize,
        width,
        height,
        mime_type: transcoded ? 'video/mp4' : file.type,
        processing_status: processingStatus,
        moderation_status: moderationStatus,
        moderation_reason: moderationReason,
      })
      .select()
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({
      media: mediaRow,
      urls: {
        original: publicOriginal.publicUrl,
        optimized: publicOptimized.publicUrl,
        poster: publicPoster?.publicUrl || null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    await cleanupDir(tmpDir)
  }
}
