import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type HungerOwnerResult = {
  id: string
  source: 'hunger-swipes'
  recordType: string
  title: string
  subtitle: string | null
  status: string | null
  destination: string
}

export function normalizeOwnerQuery(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 80)
}

function escapedPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`
}

export function maskEmail(value?: string | null) {
  if (!value) return null
  const [local, domain] = value.split('@')
  if (!domain) return null
  return `${local.slice(0, 1)}***@${domain}`
}

export function maskPhone(value?: string | null) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : '***'
}

export async function getOwnerMetrics() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  const [total, live, submissions, claims, moderation] = await Promise.all([
    admin.from('sellers').select('id', { count: 'exact', head: true }),
    admin.from('sellers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('business_submissions').select('id', { count: 'exact', head: true }).in('status', ['new', 'contacted']),
    admin.from('place_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('community_food_posts').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('moderation_status', 'pending_review'),
  ])
  const failed = [total, live, submissions, claims, moderation].find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)
  return {
    totalBusinesses: total.count ?? null,
    liveBusinesses: live.count ?? null,
    pendingBusinessSubmissions: submissions.count ?? null,
    pendingPlaceClaims: claims.count ?? null,
    pendingModeration: moderation.count ?? null,
  }
}

export async function searchOwnerRecords(rawQuery: string, limit = 18): Promise<HungerOwnerResult[]> {
  const query = normalizeOwnerQuery(rawQuery)
  if (query.length < 2) return []
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  const pattern = escapedPattern(query)
  const perType = Math.max(1, Math.min(8, Math.ceil(limit / 4)))

  const sellerQueries = ['business_name', 'contact_name', 'contact_email', 'phone'].map((column) =>
    admin.from('sellers').select('id,business_name,contact_name,contact_email,phone,status').ilike(column, pattern).limit(perType),
  )
  const submissionQueries = ['business_name', 'contact_name', 'email', 'phone'].map((column) =>
    admin.from('business_submissions').select('id,business_name,contact_name,email,phone,status').ilike(column, pattern).limit(perType),
  )
  const claimQueries = ['business_email', 'business_phone'].map((column) =>
    admin.from('place_claims').select('id,business_email,business_phone,status,place:places(name)').ilike(column, pattern).limit(perType),
  )
  const moderationQueries = ['dish_name', 'creator_name'].map((column) =>
    admin.from('community_food_posts').select('id,dish_name,creator_name,status,moderation_status,place:places(name)').ilike(column, pattern).limit(perType),
  )
  const [sellerResponses, submissionResponses, claimResponses, moderationResponses] = await Promise.all([
    Promise.all(sellerQueries), Promise.all(submissionQueries), Promise.all(claimQueries), Promise.all(moderationQueries),
  ])
  const allResponses = [...sellerResponses, ...submissionResponses, ...claimResponses, ...moderationResponses]
  const failed = allResponses.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  const unique = <T extends { id: string }>(rows: T[][]) =>
    [...new Map(rows.flat().map((row) => [row.id, row])).values()]
  const sellers = unique(sellerResponses.map((result) => result.data || []))
  const submissions = unique(submissionResponses.map((result) => result.data || []))
  const claims = unique(claimResponses.map((result) => result.data || []))
  const moderation = unique(moderationResponses.map((result) => result.data || []))

  return [
    ...sellers.map((row: any) => ({
      id: row.id, source: 'hunger-swipes' as const, recordType: 'Business', title: row.business_name,
      subtitle: maskEmail(row.contact_email) || maskPhone(row.phone) || row.contact_name || null,
      status: row.status, destination: '/admin',
    })),
    ...submissions.map((row: any) => ({
      id: row.id, source: 'hunger-swipes' as const, recordType: 'Business submission', title: row.business_name,
      subtitle: maskEmail(row.email) || maskPhone(row.phone) || row.contact_name || null,
      status: row.status, destination: '/admin',
    })),
    ...claims.map((row: any) => ({
      id: row.id, source: 'hunger-swipes' as const, recordType: 'Place claim', title: row.place?.name || 'Place claim',
      subtitle: maskEmail(row.business_email) || maskPhone(row.business_phone),
      status: row.status, destination: '/admin',
    })),
    ...moderation.map((row: any) => ({
      id: row.id, source: 'hunger-swipes' as const, recordType: 'Moderation item', title: row.dish_name || 'Food submission',
      subtitle: [row.creator_name, row.place?.name].filter(Boolean).join(' · ') || null,
      status: row.moderation_status || row.status, destination: '/admin/food-review/manage',
    })),
  ].slice(0, limit)
}
