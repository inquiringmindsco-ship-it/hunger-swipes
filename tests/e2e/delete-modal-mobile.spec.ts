import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwqvfltopgoxocvpbexq.supabase.co'
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
const authKey = `sb-${projectRef}-auth-token`

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
}

const mockPosts = [
  {
    id: 'post-1',
    dish_name: 'Test Burger',
    photo_url: '/placeholder-dish.png',
    creator_name: 'Test User',
    status: 'active',
    moderation_status: 'approved',
    place: { id: 'place-1', name: 'Test Place' },
  },
]

test.beforeEach(async ({ page }) => {
  await page.route(`${supabaseUrl}/auth/v1/user`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    })
  )
  await page.route(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...mockSession, user: mockUser }),
    })
  )
  await page.route('**/api/community-posts?mine=true', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ posts: mockPosts }),
    })
  )
  await page.route('**/api/sellers?mine=true', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ seller: null }),
    })
  )

  await page.goto('/account')
  await page.evaluate(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session))
  }, { key: authKey, session: mockSession })
})

async function openDeleteModal(page: any) {
  await expect(page.getByText('Test Burger')).toBeVisible({ timeout: 10000 })
  await page.getByLabel('Open delete confirmation').click()
}

test('delete confirmation modal is fully visible on iPhone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()

  await openDeleteModal(page)

  const deleteButton = page.getByRole('button', { name: 'Delete Post', exact: true })
  const cancelButton = page.getByRole('button', { name: 'Cancel' })

  await expect(page.getByText('Delete this food post?')).toBeVisible()
  await expect(deleteButton).toBeVisible()
  await expect(cancelButton).toBeVisible()

  // Ensure buttons are not obscured by bottom nav or safe area.
  const deleteBox = await deleteButton.boundingBox()
  const cancelBox = await cancelButton.boundingBox()
  expect(deleteBox).not.toBeNull()
  expect(cancelBox).not.toBeNull()
  expect(deleteBox!.y + deleteBox!.height).toBeLessThanOrEqual(844)
  expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(844)

  const output = path.join(process.cwd(), 'screenshots', 'delete-modal')
  await mkdir(output, { recursive: true })
  await page.screenshot({ path: path.join(output, 'iphone-390x844.png'), fullPage: false })

  await expect(page.getByRole('navigation')).not.toBeVisible()

  await cancelButton.click()
  await expect(page.getByText('Delete this food post?')).not.toBeVisible()
})

test('delete confirmation modal works at small iPhone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.reload()

  await openDeleteModal(page)

  await expect(page.getByRole('button', { name: 'Delete Post', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

  const output = path.join(process.cwd(), 'screenshots', 'delete-modal')
  await mkdir(output, { recursive: true })
  await page.screenshot({ path: path.join(output, 'iphone-se-320x568.png'), fullPage: false })
})
