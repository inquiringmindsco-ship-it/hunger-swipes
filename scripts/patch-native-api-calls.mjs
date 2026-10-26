#!/usr/bin/env node
/**
 * Patch client-side `fetch('/api/...')` / `fetch(`/api/...`)` calls to use the apiFetch wrapper
 * that resolves API URLs for the Capacitor iOS build.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { glob } from 'glob'

const files = await glob('app/**/*.{ts,tsx}')
let changed = 0

for (const file of files) {
  let content = await readFile(file, 'utf8')
  const original = content

  // Replace fetch('/api/ or fetch("/api/ or fetch(`/api/ with apiFetch, preserving quote style.
  content = content.replaceAll(/fetch\((['"`])\/api\//g, 'apiFetch($1/api/')

  if (content !== original) {
    const importLine = "import { apiFetch } from '@/lib/auth-fetch'"
    if (!content.includes(importLine)) {
      const hasAuthFetchImport = /from ['"]@\/lib\/auth-fetch['"]/.test(content)
      if (hasAuthFetchImport) {
        content = content.replace(
          /(from ['"]@\/lib\/auth-fetch['"][\s\S]*?\n)/,
          `$1${importLine}\n`,
        )
      } else {
        const firstImport = content.search(/^import /m)
        if (firstImport >= 0) {
          content = content.slice(0, firstImport) + `${importLine}\n` + content.slice(firstImport)
        } else {
          content = `${importLine}\n${content}`
        }
      }
    }
    await writeFile(file, content, 'utf8')
    changed++
    console.log(`Patched ${file}`)
  }
}

console.log(`Patched ${changed} files.`)
