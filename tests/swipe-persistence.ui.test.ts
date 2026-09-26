import { describe, expect, it, vi } from 'vitest'
import { persistSwipe } from '@/lib/swipe-persistence'

function response(status: number, payload: object) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('swipe persistence outcomes', () => {
  it('reports a successful right-swipe save', async () => {
    const request = vi.fn(async () => response(200, { success: true, saved: true }))
    await expect(persistSwipe(request)).resolves.toEqual({ ok: true, saved: true, retryable: false })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('reports a successful left swipe without a save', async () => {
    await expect(persistSwipe(async () => response(200, { success: true, saved: false })))
      .resolves.toEqual({ ok: true, saved: false, retryable: false })
  })

  it('distinguishes retryable network and server failures', async () => {
    await expect(persistSwipe(async () => { throw new TypeError('offline') })).resolves.toMatchObject({ ok: false, kind: 'network', retryable: true })
    await expect(persistSwipe(async () => response(503, { error: 'Later' }))).resolves.toMatchObject({ ok: false, kind: 'server', retryable: true })
  })

  it('does not retry authentication or application rejection blindly', async () => {
    await expect(persistSwipe(async () => response(401, { error: 'Expired' }))).resolves.toMatchObject({ kind: 'auth', retryable: false })
    await expect(persistSwipe(async () => response(404, { error: 'Content gone' }))).resolves.toMatchObject({ kind: 'rejected', retryable: false })
  })
})
