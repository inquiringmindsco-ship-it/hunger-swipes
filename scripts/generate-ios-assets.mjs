#!/usr/bin/env node
/**
 * Generate iOS app icon and launch-screen assets from existing Hunger Swipes brand files.
 */
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const publicDir = join(repoRoot, 'public')
const iosAssets = join(repoRoot, 'ios', 'App', 'App', 'Assets.xcassets')

async function generateAppIcon() {
  const source = join(publicDir, 'icon-1024.png')
  const target = join(iosAssets, 'AppIcon.appiconset', 'AppIcon-512@2x.png')
  await sharp(await readFile(source))
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(target)
  console.log(`Generated app icon: ${target}`)
}

async function generateSplash() {
  const source = join(publicDir, 'icon-1024.png')
  const size = 2732
  const logoSize = Math.round(size * 0.35)

  // Dark background #0A0A0A with the centered logo.
  const logo = await sharp(await readFile(source))
    .resize(logoSize, logoSize, { fit: 'inside' })
    .toBuffer()

  const output = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()

  const splashDir = join(iosAssets, 'Splash.imageset')
  await writeFile(join(splashDir, 'splash-2732x2732.png'), output)
  await writeFile(join(splashDir, 'splash-2732x2732-1.png'), output)
  await writeFile(join(splashDir, 'splash-2732x2732-2.png'), output)
  console.log(`Generated splash images in: ${splashDir}`)
}

async function main() {
  await generateAppIcon()
  await generateSplash()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
