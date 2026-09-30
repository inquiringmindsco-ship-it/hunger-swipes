'use client'

import { useEffect, useState } from 'react'

type DiscoveryMode = 'eat' | 'make' | 'explore'

const MODES: { value: DiscoveryMode; label: string }[] = [
  { value: 'eat', label: 'EAT' },
  { value: 'make', label: 'MAKE' },
  { value: 'explore', label: 'EXPLORE' },
]

const STORAGE_KEY = 'hs_discovery_mode'

interface Props {
  value: DiscoveryMode
  onChange: (mode: DiscoveryMode) => void
}

export function DiscoveryModeSwitch({ value, onChange }: Props) {
  // Hydrate from localStorage once on mount
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (hydrated) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DiscoveryMode | null
      if (saved && MODES.some((m) => m.value === saved) && saved !== value) {
        onChange(saved)
      }
    } catch {
      // localStorage unavailable
    }
    setHydrated(true)
  }, [hydrated, onChange, value])

  const select = (mode: DiscoveryMode) => {
    onChange(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center justify-between gap-1 rounded-xl border border-white/[0.06] bg-hs-charcoal p-0.5 mb-2">
      {MODES.map((mode) => {
        const active = value === mode.value
        return (
          <button
            key={mode.value}
            onClick={() => select(mode.value)}
            className={`flex-1 min-h-8 rounded-lg text-[11px] font-black tracking-wide transition-all ${
              active
                ? 'bg-hs-gold text-hs-black shadow-sm'
                : 'text-hs-gray hover:text-hs-cream hover:bg-hs-soft'
            }`}
            aria-pressed={active}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}

export function useStoredDiscoveryMode(defaultMode: DiscoveryMode = 'eat') {
  const [mode, setMode] = useState<DiscoveryMode>(defaultMode)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DiscoveryMode | null
      if (saved && MODES.some((m) => m.value === saved)) {
        setMode(saved)
      }
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  const storeMode = (next: DiscoveryMode) => {
    setMode(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  return { mode, setMode: storeMode, ready }
}
