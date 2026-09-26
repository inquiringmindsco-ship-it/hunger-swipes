export type SwipeFailureKind = 'network' | 'auth' | 'rejected' | 'server'

export interface SwipeWriteResult {
  ok: boolean
  saved: boolean
  retryable: boolean
  kind?: SwipeFailureKind
  message?: string
}

export async function persistSwipe(
  request: () => Promise<Response>,
): Promise<SwipeWriteResult> {
  try {
    const response = await request()
    const payload = await response.json().catch(() => ({}))
    if (response.ok) {
      return { ok: true, saved: Boolean(payload.saved), retryable: false }
    }
    const message = typeof payload.error === 'string' ? payload.error : 'Swipe was not accepted'
    if (response.status === 401 || response.status === 403) {
      return { ok: false, saved: false, retryable: false, kind: 'auth', message }
    }
    if (response.status >= 500) {
      return { ok: false, saved: false, retryable: true, kind: 'server', message }
    }
    return { ok: false, saved: false, retryable: false, kind: 'rejected', message }
  } catch {
    return {
      ok: false,
      saved: false,
      retryable: true,
      kind: 'network',
      message: 'Network unavailable. Your choice was not lost.',
    }
  }
}
