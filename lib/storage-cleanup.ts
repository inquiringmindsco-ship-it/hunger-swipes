import { getSupabaseAdmin } from './supabase-admin'

export async function safeRemoveStoredImage(url?: string): Promise<{ deleted: boolean; reason?: string; removed: boolean }> {
  if (!url) return { deleted: false, reason: 'no_url', removed: false }
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  try {
    const bucket = 'dish-photos'
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const path = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/')
    if (!path) return { deleted: false, reason: 'no_path', removed: false }
    await admin.storage.from(bucket).remove([path])
    return { deleted: true, removed: true }
  } catch (err: any) {
    return { deleted: false, reason: err.message, removed: false }
  }
}

export async function deleteFoodMedia(mediaId: string, opts: { force?: boolean } = {}) {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')

  const { data: media, error: fetchError } = await admin
    .from('food_media')
    .select('*')
    .eq('id', mediaId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!media) return { deleted: false, reason: 'not_found' }

  if (!opts.force) {
    // If another row references the same optimized_path, do not delete it.
    if (media.optimized_path) {
      const { data: refs } = await admin
        .from('food_media')
        .select('id')
        .eq('optimized_path', media.optimized_path)
        .neq('id', mediaId)
        .limit(1)
      if (refs && refs.length > 0) return { deleted: false, reason: 'still_referenced' }
    }
  }

  const paths: string[] = []
  if (media.original_path) paths.push(media.original_path)
  if (media.optimized_path && media.optimized_path !== media.original_path) paths.push(media.optimized_path)
  if (media.thumbnail_path) paths.push(media.thumbnail_path)

  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from('food-media').remove(paths)
    if (storageError) throw storageError
  }

  const { error: deleteError } = await admin.from('food_media').delete().eq('id', mediaId)
  if (deleteError) throw deleteError

  return { deleted: true }
}

export async function deleteMediaByDishId(dishId: string) {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')

  const { data: mediaRows } = await admin.from('food_media').select('id').eq('dish_id', dishId)
  for (const row of mediaRows || []) {
    await deleteFoodMedia(row.id)
  }
}
