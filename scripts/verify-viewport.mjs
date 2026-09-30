import puppeteer from 'puppeteer'

const viewports = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'Galaxy S8', width: 360, height: 800 },
  { name: 'iPhone 12/13/14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Tablet-ish', width: 712, height: 1048 },
]

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()

async function checkViewport({ name, width, height }) {
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true })
  await page.goto('http://localhost:3000/swipe', { waitUntil: 'networkidle0', timeout: 30000 })
  const result = await page.evaluate(() => {
    const nav = document.querySelector('nav.fixed.bottom-0')
    const modeSwitch = document.querySelector('[role="dialog"]') ? null : document.querySelector('.rounded-xl')?.closest('div') || null
    const passBtn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('Pass'))
    const wantBtn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('Want'))
    const card = document.querySelector('[data-testid="swipe-card"]')
    if (!nav || !passBtn || !wantBtn || !card) return { ok: false, reason: 'missing elements' }
    const navRect = nav.getBoundingClientRect()
    const passRect = passBtn.getBoundingClientRect()
    const wantRect = wantBtn.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const passVisible = passRect.bottom <= navRect.top - 4
    const wantVisible = wantRect.bottom <= navRect.top - 4
    return {
      ok: passVisible && wantVisible,
      navTop: navRect.top,
      passBottom: passRect.bottom,
      wantBottom: wantRect.bottom,
      cardBottom: cardRect.bottom,
    }
  })
  console.log(`${result.ok ? '✅' : '❌'} ${name} (${width}x${height})`, result)
}

for (const vp of viewports) await checkViewport(vp)
await browser.close()
