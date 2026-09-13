'use client'

const EATER_ID_KEY = 'hs_eater_id'

export function getEaterId(): string {
  if (typeof window === 'undefined') return ''

  const existing = localStorage.getItem(EATER_ID_KEY)
  if (existing) return existing

  const id = `eater-${crypto.randomUUID()}`
  localStorage.setItem(EATER_ID_KEY, id)
  return id
}
