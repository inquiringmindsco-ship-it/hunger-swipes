import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { runPlaceImport } from '@/lib/place-importer'

function isAdmin(request: NextRequest) {
  const provided = Buffer.from(request.headers.get('x-admin-secret') || '')
  const expected = Buffer.from(process.env.ADMIN_SECRET || '')
  return expected.length > 0 && provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data, error } = await admin.from('place_import_runs').select('*').order('started_at', { ascending: false }).limit(25)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data || [] })
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const areaLabel = typeof body.areaLabel === 'string' ? body.areaLabel.trim().slice(0, 160) : ''
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const radiusMeters = Math.round(Number(body.radiusMeters))
  const mode = body.mode === 'import' ? 'import' : body.mode === 'preview' ? 'preview' : null
  if (!areaLabel || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isInteger(radiusMeters) || radiusMeters < 100 || radiusMeters > 25000 || !mode) {
    return NextResponse.json({ error: 'areaLabel, valid coordinates, radiusMeters (100–25000), and mode (preview|import) are required' }, { status: 400 })
  }
  try {
    return NextResponse.json(await runPlaceImport({ areaLabel, latitude, longitude, radiusMeters, mode }))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 502 })
  }
}
