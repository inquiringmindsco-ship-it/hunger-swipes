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
  test.setTimeout(35_000)
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

// ============================================================
// EXIT MOTION REGRESSION
// ============================================================

function parseTransformX(style: string): number {
  if (!style || style === 'none') return 0
  const matrix = style.match(/matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/)
  if (matrix) return parseFloat(matrix[5])
  const t3d = style.match(/translate3d\(([^,]+)px,/)
  if (t3d) return parseFloat(t3d[1])
  const t2d = style.match(/translate\(([^,]+)px,/)
  if (t2d) return parseFloat(t2d[1])
  return 0
}

function exitMotion(samples: number[], direction: 'left' | 'right') {
  const firstCross = samples.findIndex((x) => Math.abs(x) > 40)
  if (firstCross === -1) return null
  let end = samples.length
  for (let i = firstCross + 2; i < samples.length; i += 1) {
    // After the card fully exits it may be unmounted/replaced, at which point the sampled
    // transform drops back to 0. Stop the motion segment before that reset.
    if (Math.abs(samples[i]) < 40) { end = i; break }
  }
  const motion = samples.slice(firstCross, end)
  return direction === 'left'
    ? motion.every((x) => x < -30) && Math.min(...motion) < -300 ? motion : null
    : motion.every((x) => x > 30) && Math.max(...motion) > 300 ? motion : null
}

async function sampleCardExit(page: Page, trigger: () => Promise<void>) {
  const card = page.getByTestId('swipe-card')
  await card.waitFor()
  const handle = await card.elementHandle()
  if (!handle) throw new Error('Swipe card element handle not found')

  await trigger()

  return handle.evaluate(async (el) => {
    const parse = (style: string) => {
      if (!style || style === 'none') return 0
      const matrix = style.match(/matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/)
      if (matrix) return parseFloat(matrix[5])
      const t3d = style.match(/translate3d\(([^,]+)px,/)
      if (t3d) return parseFloat(t3d[1])
      const t2d = style.match(/translate\(([^,]+)px,/)
      if (t2d) return parseFloat(t2d[1])
      return 0
    }
    const samples: number[] = []
    const start = performance.now()
    while (performance.now() - start < 450) {
      if (!el.isConnected) break
      samples.push(parse(window.getComputedStyle(el).transform))
      await new Promise((r) => requestAnimationFrame(r))
    }
    return samples
  })
}

async function dragPastThreshold(page: Page, direction: 'left' | 'right') {
  const card = page.getByTestId('swipe-card')
  const box = await card.boundingBox()
  if (!box) throw new Error('Swipe card did not render')
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  const travel = 200
  const endX = direction === 'left' ? startX - travel : startX + travel

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + (direction === 'left' ? -10 : 10), startY + 2, { steps: 2 })
  await page.mouse.move(endX, startY, { steps: 8 })
  await page.mouse.up()
}

for (const viewport of [
  { name: 'mobile-320x568', width: 320, height: 568 },
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-430x932', width: 430, height: 932 },
]) {
  test(`committed left swipe exits continuously without returning to center at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openGuestFeed(page)
    const samples = await sampleCardExit(page, async () => dragPastThreshold(page, 'left'))
    await expect(page.getByRole('heading', { name: 'Test Dish 2' })).toBeVisible()

    expect(samples.length).toBeGreaterThanOrEqual(5)
    const motion = exitMotion(samples, 'left')
    expect(motion).not.toBeNull()
    expect(motion!.length).toBeGreaterThanOrEqual(5)
  })

  test(`committed right swipe exits continuously without returning to center at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openGuestFeed(page)
    const samples = await sampleCardExit(page, async () => dragPastThreshold(page, 'right'))
    await expect(page).toHaveURL(/\/auth\?mode=signup&next=%2Fswipe|\/auth\?mode=signup&next=\/swipe/)

    expect(samples.length).toBeGreaterThanOrEqual(5)
    const motion = exitMotion(samples, 'right')
    expect(motion).not.toBeNull()
    expect(motion!.length).toBeGreaterThanOrEqual(5)
  })

  test(`uncommitted swipe returns to center at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openGuestFeed(page)
    const card = page.getByTestId('swipe-card')
    const box = await card.boundingBox()
    if (!box) throw new Error('Swipe card did not render')
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    const samples = await sampleCardExit(page, async () => {
      await page.mouse.move(startX, startY)
      await page.mouse.down()
      await page.mouse.move(startX - 20, startY, { steps: 3 })
      await page.mouse.up()
    })
    await expect(page.getByRole('heading', { name: 'Test Dish 1' })).toBeVisible()

    expect(samples.length).toBeGreaterThan(3)
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(10)
  })

  test(`PASS button animates card left continuously at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openGuestFeed(page)
    const samples = await sampleCardExit(page, async () => {
      await page.getByRole('button', { name: 'Pass on Test Dish 1' }).click()
    })
    await expect(page.getByRole('heading', { name: 'Test Dish 2' })).toBeVisible()

    expect(samples.length).toBeGreaterThan(5)
    const motion = exitMotion(samples, 'left')
    expect(motion).not.toBeNull()
    expect(motion!.length).toBeGreaterThanOrEqual(5)
  })

  test(`WANT button animates card right continuously at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openGuestFeed(page)
    const samples = await sampleCardExit(page, async () => {
      await page.getByRole('button', { name: 'Want Test Dish 1' }).click()
    })
    await expect(page).toHaveURL(/\/auth\?mode=signup&next=%2Fswipe|\/auth\?mode=signup&next=\/swipe/)

    expect(samples.length).toBeGreaterThanOrEqual(5)
    const motion = exitMotion(samples, 'right')
    expect(motion).not.toBeNull()
    expect(motion!.length).toBeGreaterThanOrEqual(5)
  })
}

