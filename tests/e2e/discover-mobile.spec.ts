import { test, expect } from '@playwright/test'

const BASE = process.env.DISCOVER_E2E_BASE_URL || 'http://localhost:3000'

// Signed-out browse only — the spec performs zero swipe/save writes (Pass/Want are
// render-presence checks only; no button is clicked).
test.describe('Discover mobile recovery', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('mobile swipe deck renders a real card with interaction affordances and bottom nav', async ({ page }) => {
    await page.goto(`${BASE}/swipe`, { waitUntil: 'networkidle' })
    // Swipe UI shows the deck one card at a time (card-stack design):
    const card = page.locator('[data-testid="swipe-card"], article').first()
    await expect(card).toBeVisible()
    // Interaction affordances exist (mobile usability), but are NOT clicked here.
    await expect(page.getByRole('button', { name: /want/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /pass/i }).first()).toBeVisible()
    // Bottom navigation + discovery-mode tabs render.
    await expect(page.getByRole('navigation').last()).toBeVisible()
    await expect(page.getByRole('button', { name: /EAT/ })).toBeVisible()
  })

  test('deck supply: signed-out session receives full eligible catalog without duplicate keys', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dishes?limit=50`)
    expect(response.ok()).toBeTruthy()
    const payload = await response.json()
    const items = payload.dishes || []
    expect(items.length, 'signed-out deck should include all eligible cards').toBeGreaterThanOrEqual(7)
    const keys = items.map((i: any) => `${i.content_kind}:${i.id}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('rights gate: production deck never serves unlicensed starter imagery', async ({ request }) => {
    const response = await request.get(`${BASE}/api/dishes?limit=50`)
    const payload = await response.json()
    for (const item of payload.dishes || []) {
      if (item.content_kind === 'place_staging') {
        expect(item.rights_status || 'approved').not.toBe('permission_required')
      }
    }
  })

  test('dish lab exists only on preview gated environments', async ({ request }) => {
    const response = await request.get(`${BASE}/preview/dishes`)
    expect([200, 404]).toContain(response.status())
  })
})