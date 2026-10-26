import { expect, test } from '@playwright/test'

const candidate = {
  id: 'candidate-1',
  dish_name: 'Owner Test Pizza',
  image_url: '/placeholder-dish.png',
  source_url: 'https://example.com/source',
  source_type: 'owner_upload',
  rights_status: 'approved',
  usage_status: null,
  notes: 'Owner authorized test image',
  bucket: 'A',
  bucket_reason: 'rights documented — ready to publish',
  place: { id: 'place-1', name: 'Owner Test Kitchen', city: 'St. Louis', state: 'MO', status: 'active', staged: false },
}

test('signed-out and ordinary users see no owner controls', async ({ page }) => {
  await page.route('**/api/admin/session', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ authenticated: false }) }))
  await page.goto('/admin/dish-candidates')
  await expect(page.getByRole('heading', { name: 'Owner access required' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in as owner' })).toHaveAttribute('href', '/auth?next=/admin/dish-candidates')
  await expect(page.getByRole('button', { name: /Publish/ })).toHaveCount(0)
})

test('owner can review and operate Dish Manager from a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.route('**/api/admin/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, method: 'owner' }) }))
  await page.route('**/api/admin/dish-candidates?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [candidate],
      counts: { total: 1, A: 1, B: 0, C: 0, livePublished: 7 },
      live: { stagedPlaces: [], stagedInDb: 0, stagedShownInDiscover: 0, communityApproved: 7, officialDishes: 0 },
    }),
  }))
  let action = ''
  await page.route('**/api/admin/dish-candidates', async (route) => {
    action = (await route.request().postDataJSON()).action
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ id: candidate.id, ok: true }] }) })
  })
  await page.goto('/admin/dish-candidates')
  await expect(page.getByRole('heading', { name: 'Dish Manager' })).toBeVisible()
  await expect(page.getByText('Owner Test Pizza')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace image' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible()
  await page.getByRole('button', { name: 'View full image for Owner Test Pizza' }).click()
  await expect(page.getByRole('dialog', { name: 'Full image: Owner Test Pizza' })).toBeVisible()
  await page.getByRole('button', { name: 'Close full image' }).click()
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect.poll(() => action).toBe('publish')
})
