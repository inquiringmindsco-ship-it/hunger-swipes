#!/usr/bin/env node
/**
 * Build Hunger Swipes for iOS Capacitor static export.
 * Next.js `output: 'export'` does not support API Routes. This script
 * temporarily moves `app/api` aside, builds a static client bundle into `dist/`,
 * then restores `app/api` and syncs the web assets into the iOS project.
 *
 * The iOS app calls the live production API at NEXT_PUBLIC_API_BASE_URL.
 */
import { rename, existsSync, rmSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const apiDir = join(repoRoot, 'app', 'api')
const robotsFile = join(repoRoot, 'app', 'robots.ts')
const sitemapFile = join(repoRoot, 'app', 'sitemap.ts')
const holdDir = join(repoRoot, '..', '.hunger-swipes-ios-hold')
const apiHold = join(holdDir, 'api')
const robotsHold = join(holdDir, 'robots.ts')
const sitemapHold = join(holdDir, 'sitemap.ts')
const nextCache = join(repoRoot, '.next')
const distDir = join(repoRoot, 'dist')

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit' })
}

async function move(from, to) {
  if (!existsSync(from)) {
    console.warn(`Skipping move: ${from} does not exist`)
    return
  }
  if (existsSync(to)) {
    throw new Error(`Cannot move ${from} to ${to}: destination already exists`)
  }
  const toParent = dirname(to)
  if (!existsSync(toParent)) mkdirSync(toParent, { recursive: true })
  await new Promise((resolve, reject) => {
    rename(from, to, (err) => (err ? reject(err) : resolve()))
  })
}

async function main() {
  // Clean caches so moving files doesn't leave stale type references.
  if (existsSync(nextCache)) rmSync(nextCache, { recursive: true, force: true })
  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true })

  const movedPaths = []
  try {
    await move(apiDir, apiHold); movedPaths.push([apiDir, apiHold])
    await move(robotsFile, robotsHold); movedPaths.push([robotsFile, robotsHold])
    await move(sitemapFile, sitemapHold); movedPaths.push([sitemapFile, sitemapHold])
    run('IOS_BUILD=true next build')
  } finally {
    for (const [from, to] of movedPaths) {
      await move(to, from)
    }
  }
  run('npx cap sync ios')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
