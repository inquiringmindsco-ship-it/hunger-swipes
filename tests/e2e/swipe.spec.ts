import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const fixtureDishes = Array.from({ length: 30 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  content_kind: 'official',
  photo_url: '/placeholder-dish.png',
  name: `Test Dish ${index + 1}`,
  category: 'Comfort Food',
  tags: ['Comfort Food'],
  price: 14,
  seller: { id: `seller-${index}`, business_name: `Test Kitchen ${index + 1}`, city: 'Ferguson', state: 'MO' },
}))

async function openGuestFeed(page: Page) {
  await page.route('**/api/dishes?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ dishes: fixtureDishes, hasMore: false, nextOffset: fixtureDishes.length }),
  }))
  await page.goto('/swipe')
  await expect(page.getByRole('heading', { name: 'Test Dish 1' })).toBeVisible()
}

test('guest buttons share the swipe flow and wanting prompts signup without writing', async ({ page }) => {
  let writes = 0
  await page.route('**/api/swipe', (route) => { writes += 1; return route.fulfill({ status: 500 }) })
  await openGuestFeed(page)
  await page.getByRole('button', { name: 'Pass on Test Dish 1' }).click()
  await expect(page.getByRole('heading', { name: 'Test Dish 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Want Test Dish 2' }).click()
  await expect(page).toHaveURL(/\/auth\?mode=signup&next=%2Fswipe|\/auth\?mode=signup&next=\/swipe/)
  expect(writes).toBe(0)
})

test('gesture threshold and axis lock preserve the current card', async ({ page }) => {
  await openGuestFeed(page)
  const card = page.getByTestId('swipe-card')
  const box = await card.boundingBox()
  if (!box) throw new Error('Swipe card did not render')
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 25, center.y + 2, { steps: 4 })
  await page.mouse.up()
  await expect(page.getByRole('heading', { name: 'Test Dish 1' })).toBeVisible()

  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 8, center.y + 140, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByRole('heading', { name: 'Test Dish 1' })).toBeVisible()
})

test('one horizontal gesture advances exactly one card', async ({ page }) => {
  await openGuestFeed(page)
  const card = page.getByTestId('swipe-card')
  const box = await card.boundingBox()
  if (!box) throw new Error('Swipe card did not render')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 20, box.y + box.height / 2 - 8, { steps: 2 })
  await page.mouse.move(box.x - 180, box.y + box.height / 2 - 18, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByRole('heading', { name: 'Test Dish 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Test Dish 3' })).not.toBeVisible()
})

test('approved composition remains usable at target viewports', async ({ page }) => {
  await openGuestFeed(page)
  const output = path.join(process.cwd(), 'screenshots', 'gate3')
  await mkdir(output, { recursive: true })
  for (const viewport of [
    { name: 'mobile-320x568', width: 320, height: 568 },
    { name: 'mobile-360x800', width: 360, height: 800 },
    { name: 'mobile-390x844', width: 390, height: 844 },
    { name: 'mobile-430x932', width: 430, height: 932 },
    { name: 'tablet-768x1024', width: 768, height: 1024 },
    { name: 'desktop-1280x800', width: 1280, height: 800 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await expect(page.getByTestId('swipe-card')).toBeVisible()
    await page.screenshot({ path: path.join(output, `swipe-${viewport.name}.png`), fullPage: true })
  }
})

test('slow feed shows honest loading before recovering', async ({ page }) => {
  await page.route('**/api/dishes?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dishes: fixtureDishes, hasMore: false }) })
  })
  await page.goto('/swipe')
  await expect(page.getByText('Finding great food near you…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Test Dish 1' })).toBeVisible()
})

test('feed refills before exhaustion without repeating consumed cards', async ({ page }) => {
  test.setTimeout(20_000)
  let requests = 0
  await page.route('**/api/dishes?**', (route) => {
    requests += 1
    const dishes = requests === 1 ? fixtureDishes.slice(0, 20) : fixtureDishes.slice(20)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dishes, hasMore: requests === 1 }) })
  })
  await page.goto('/swipe')
  for (let number = 1; number <= 20; number += 1) {
    await page.getByRole('button', { name: `Pass on Test Dish ${number}` }).click()
    await expect(page.getByRole('heading', { name: `Test Dish ${number + 1}` })).toBeVisible()
  }
  expect(requests).toBeGreaterThanOrEqual(2)
  await expect(page.getByRole('heading', { name: 'Test Dish 21' })).toBeVisible()
})
