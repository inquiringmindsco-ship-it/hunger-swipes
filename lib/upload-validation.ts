const TYPES: Record<string, { extension: string; signature: (bytes: Uint8Array) => boolean }> = {
  'image/jpeg': { extension: 'jpg', signature: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { extension: 'png', signature: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  'image/webp': { extension: 'webp', signature: b => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP' },
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function validateImageMetadata(type: string, size: number) {
  if (!TYPES[type]) return { ok: false as const, error: 'Use a JPEG, PNG, or WebP image' }
  if (size <= 0) return { ok: false as const, error: 'The image is empty' }
  if (size > MAX_IMAGE_BYTES) return { ok: false as const, error: 'Images must be 5 MB or smaller' }
  return { ok: true as const, extension: TYPES[type].extension }
}

export function hasValidImageSignature(type: string, bytes: Uint8Array) {
  return Boolean(TYPES[type]?.signature(bytes))
}
