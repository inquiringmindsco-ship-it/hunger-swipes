import { expect, test } from '@playwright/test'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwqvfltopgoxocvpbexq.supabase.co'
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
const authKey = `sb-${projectRef}-auth-token`
const mockUser = { id: 'dish-form-user', email: 'dish-form@example.com', user_metadata: {} }
const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
}

const viewports = [
  { name: 'small iPhone', width: 320, height: 568 },
  { name: 'large iPhone', width: 430, height: 932 },
]

for (const viewport of viewports) {
  test.describe(`Add a Dish — ${viewport.name}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true })

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: authKey, session: mockSession })
      await page.route(`${supabaseUrl}/auth/v1/user`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) }))
      await page.route(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSession) }))
      await page.route('**/api/sellers**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ seller: { id: 'seller-mobile-test', seller_type: 'home_cook' } }),
        })
      })
    })

    test('is compact, responsive, and restores ingredient drafts', async ({ page }) => {
      await page.goto('/seller/dishes/new')

      await expect(page.getByText('Add the recipe next')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
      await expect(page.getByLabel('Ingredient 1 name')).toHaveCount(0)
      await expect(page.getByLabel('Price ($)')).toHaveCount(0)

      await page.getByRole('button', { name: 'Add ingredient' }).click()
      await page.getByLabel('Ingredient 1 quantity').fill('2')
      await page.getByLabel('Ingredient 1 unit').fill('cups')
      await page.getByLabel('Ingredient 1 name').fill('rice')
      await page.getByLabel(/About this dish/).fill('Family recipe')
      await page.getByRole('button', { name: /Offer this dish for sale/ }).click()
      await page.getByLabel('Price ($)').fill('12')

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      await page.reload()
      await expect(page.getByLabel('Ingredient 1 name')).toHaveValue('rice')
      await expect(page.getByLabel(/About this dish/)).toHaveValue('Family recipe')
      await expect(page.getByLabel('Price ($)')).toHaveValue('12')

      const submit = page.getByRole('button', { name: /Submit for Review/ })
      await submit.scrollIntoViewIfNeeded()
      await expect(submit).toBeVisible()
      await expect(page.getByTestId('mobile-nav')).toBeVisible()
      const submitBox = await submit.boundingBox()
      const navBox = await page.getByTestId('mobile-nav').boundingBox()
      expect(submitBox && navBox && submitBox.y + submitBox.height <= navBox.y).toBeTruthy()
    })
  })
}
