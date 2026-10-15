#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'

const file = 'app/post/page.tsx'
let content = await readFile(file, 'utf8')

// Add handlePickPhoto function before handlePhotoChange.
const marker = '  function handlePhotoChange'
const idx = content.indexOf(marker)
if (idx > 0) {
  const insertion = `  async function handlePickPhoto(source?: 'camera' | 'photos' | 'prompt') {
    const picked = await pickImage({ source: source || 'prompt' })
    if (!picked) return
    setFile(picked.file)
    setPreviewUrl(picked.previewUrl)
  }

`
  content = content.slice(0, idx) + insertion + content.slice(idx)
}

// Make the photo label clickable via handlePickPhoto while keeping the hidden file input for web fallback.
const labelOpen = 'htmlFor="photo"'
const labelIdx = content.indexOf(labelOpen)
if (labelIdx > 0) {
  const before = content.slice(0, labelIdx)
  const after = content.slice(labelIdx + labelOpen.length)
  const replacement = 'onClick={() => handlePickPhoto()}\n              role="button"\n              tabIndex={0}\n              onKeyDown={(event) => { if (event.key === \'Enter\' || event.key === \' \') { event.preventDefault(); handlePickPhoto() } }}'
  content = before + replacement + after
}

await writeFile(file, content, 'utf8')
console.log(`Patched ${file}`)
