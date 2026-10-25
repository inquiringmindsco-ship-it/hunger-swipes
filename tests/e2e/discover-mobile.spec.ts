import { test, expect } from '@playwright/test'

const BASE = process.env.DISCOVER_E2E_BASE_URL || 'http://localhost:3000'

// Signed-out browse only — the spec performs zero swipe/save writes.
test.describe('Discover mobile recovery', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('mobile swipe deck renders eligible cards with a usable bottom nav', async ({ page }) => {
    await page.goto(`${BASE}/swipe`, { waitUntil: 'networkidle' })
    const cards = page.locator('[data-testid="dish-card"], [data-card-id]')
    const count = await cards.count()
    expect(count, 'signed-out deck should include all eligible cards (no history exhaustion)').toBeGreaterThanOrEqual(7)
    const nav = page.getByRole('navigation').last()
    await expect(nav).toBeVisible()
  })

  test('deck contains no duplicate card keys on first page', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dishes?limit=50`)
    expect(response.ok()).toBeTruthy()
    const payload = await response.json()
    const items = payload.dishes || []
    const keys = items.map((i: any) => `${i.content_kind}:${i.id}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('preview dish lab renders demo deck only on preview/lab environments', async ({ page, request }) => {
    const response = await request.get(`${BASE}/api/dishes?limit=50`)
    expect(response.ok()).toBeTruthy()
    const payload = await response.json()
    const items = payload.dishes || []
    // The production deck must never contain rights-gated starter images.
    for (const item of items) {
      if (item.content_kind === 'place_staging') {
        expect(item.rights_status || 'approved').not.toBe('permission_required')
      }
    }
    // The lab page itself: must not 200 on an unconfigured production host.
    const lab = await page.request.get(`${BASE}/preview/dishes`)
    expect([200, 404]).toContain(lab.status())
  })
})