import { chromium, devices } from 'playwright'
import fs from 'fs'

const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
const outDir = '/Users/sentinel/Documents/hunger-swipes/screenshots/gate2'
fs.mkdirSync(outDir, { recursive: true })

const viewports = [
  { name: 'iphone-se', width: 320, height: 568, label: '320x568' },
  { name: 'android-default', width: 360, height: 800, label: '360x800' },
  { name: 'iphone-14', width: 390, height: 844, label: '390x844' },
  { name: 'iphone-14-pro-max', width: 430, height: 932, label: '430x932' },
  { name: 'ipad-mini', width: 768, height: 1024, label: 'tablet' },
  { name: 'desktop', width: 1280, height: 800, label: 'desktop' },
]

const routes = [
  { path: '/swipe', name: 'discover' },
  { path: '/saved', name: 'saved' },
  { path: '/post', name: 'post' },
  { path: '/join', name: 'join' },
  { path: '/account', name: 'account' },
  { path: '/seller/dashboard', name: 'seller-dashboard' },
]

async function run() {
  const browser = await chromium.launch()

  for (const route of routes) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: devices['iPhone 14']?.userAgent || 'Mozilla/5.0',
      })
      const page = await context.newPage()
      try {
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 })
        // Wait a bit for any redirects and animations
        await page.waitForTimeout(1000)
        const fileName = `${route.name}-${vp.name}.png`
        await page.screenshot({ path: `${outDir}/${fileName}`, fullPage: false })
        console.log(`Captured ${fileName}`)
      } catch (err) {
        console.error(`Failed ${route.path} @ ${vp.label}: ${err.message}`)
      } finally {
        await context.close()
      }
    }
  }

  await browser.close()
  console.log(`Screenshots saved to ${outDir}`)
}

run().catch(err => { console.error(err); process.exit(1) })
