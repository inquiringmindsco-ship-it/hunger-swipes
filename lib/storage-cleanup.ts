import { getSupabaseAdmin } from './supabase-admin'

/**
 * Remove a stored image object if it is not referenced by any remaining active row.
 * This preserves shared assets and audit records while avoiding orphaned files.
 */
export async function safeRemoveStoredImage(
  photoUrl: string,
  refsToCheck: { table: string; column: string; extraFilter?: string }[] = []
): Promise<{ removed: boolean; reason?: string }> {
  const admin = getSupabaseAdmin()
  if (!admin) return { removed: false, reason: 'Admin client not configured' }

  const path = extractStoragePath(photoUrl)
  if (!path) return { removed: false, reason: 'Could not parse storage path' }

  // Default checks for common Hunger Swipes tables that reference dish photos.
  const defaultChecks = [
    { table: 'community_food_posts', column: 'photo_url', extraFilter: "status = 'active'" },
    { table: 'dishes', column: 'photo_url', extraFilter: "status != 'removed'" },
    { table: 'sellers', column: 'logo_url' },
  ]
  const checks = refsToCheck.length ? refsToCheck : defaultChecks

  for (const { table, column, extraFilter } of checks) {
    const query = admin
      .from(table)
      .select(column, { count: 'exact', head: true })
      .ilike(column, `%${path}%`)
    const { count, error } = await (extraFilter ? query.or(extraFilter) : query)
    if (error) {
      console.error(`safeRemoveStoredImage check failed on ${table}.${column}`, error)
      return { removed: false, reason: 'Reference check failed' }
    }
    if (count && count > 0) {
      return { removed: false, reason: 'Asset still referenced' }
    }
  }

  const bucket = path.split('/')[0]
  const objectPath = path.slice(bucket.length + 1)
  if (!bucket || !objectPath) return { removed: false, reason: 'Invalid bucket/path' }

  const { error } = await admin.storage.from(bucket).remove([objectPath])
  if (error) {
    console.error('safeRemoveStoredImage remove error', error)
    return { removed: false, reason: error.message }
  }

  return { removed: true }
}

export function extractStoragePath(photoUrl: string): string | null {
  try {
    const url = new URL(photoUrl)
    const pathParts = url.pathname.split('/')
    // Supabase public URL format: /storage/v1/object/public/{bucket}/{path...}
    const publicIdx = pathParts.indexOf('public')
    if (publicIdx !== -1 && pathParts.length > publicIdx + 2) {
      return pathParts.slice(publicIdx + 1).join('/')
    }
    // Fallback: last two segments as bucket/path is unreliable; return raw path minus leading slash.
    return url.pathname.replace(/^\//, '')
  } catch {
    return null
  }
}
