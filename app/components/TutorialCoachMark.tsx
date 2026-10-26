'use client'

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { useDialogA11y } from '@/lib/dialog-a11y'

export interface TutorialStep {
  targetId: string
  title: string
  body: string
  placement?: 'above' | 'below' | 'center'
  dimBackground?: boolean
}

interface TutorialCoachMarkProps {
  open: boolean
  steps: TutorialStep[]
  storageKey: string
  onClose: () => void
}

interface Box { top: number; left: number; width: number; height: number }

export default function TutorialCoachMark({ open, steps, storageKey, onClose }: TutorialCoachMarkProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetBox, setTargetBox] = useState<Box | null>(null)

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, 'true') } catch {}
    setStepIndex(0)
    onClose()
  }, [onClose, storageKey])

  const panelRef = useDialogA11y(open, finish)
  const step = steps[stepIndex]

  const measureTarget = useCallback(() => {
    if (!open || !step) return
    const target = document.getElementById(step.targetId)
    if (!target) return setTargetBox(null)
    const rect = target.getBoundingClientRect()
    setTargetBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
  }, [open, step])

  useLayoutEffect(() => {
    if (!open) return
    measureTarget()
    window.addEventListener('resize', measureTarget)
    window.visualViewport?.addEventListener('resize', measureTarget)
    return () => {
      window.removeEventListener('resize', measureTarget)
      window.visualViewport?.removeEventListener('resize', measureTarget)
    }
  }, [measureTarget, open])

  useEffect(() => { if (open) setStepIndex(0) }, [open])

  if (!open || !step) return null

  const placement = step.placement || 'below'
  const panelStyle: CSSProperties = placement === 'center' || !targetBox
    ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    : placement === 'above'
      ? { left: '50%', bottom: `max(calc(100dvh - ${Math.max(8, targetBox.top - 10)}px), calc(env(safe-area-inset-bottom, 0px) + 5.25rem))`, transform: 'translateX(-50%)' }
      : { left: '50%', top: `${Math.min(window.innerHeight - 230, targetBox.top + targetBox.height + 12)}px`, transform: 'translateX(-50%)' }

  return (
    <div className="fixed inset-0 z-[90]" aria-label={`Quick tour, step ${stepIndex + 1} of ${steps.length}`}>
      <div className={`absolute inset-0 ${step.dimBackground ? 'bg-black/65' : 'bg-black/45'} backdrop-blur-[1px]`} aria-hidden="true" />
      {targetBox && (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-hs-gold shadow-[0_0_0_4px_rgba(212,175,55,0.2)]"
          style={{ top: Math.max(4, targetBox.top - 4), left: Math.max(4, targetBox.left - 4), width: Math.min(window.innerWidth - 8, targetBox.width + 8), height: targetBox.height + 8 }}
          aria-hidden="true"
        />
      )}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-tour-title"
        aria-describedby="quick-tour-body"
        className="fixed w-[calc(100%-2rem)] max-w-[280px] rounded-2xl border border-hs-gold/30 bg-hs-charcoal p-4 shadow-card-lg outline-none"
        style={panelStyle}
      >
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-hs-gold">{stepIndex + 1} of {steps.length}</p>
        <h2 id="quick-tour-title" className="text-base font-black text-hs-cream">{step.title}</h2>
        <p id="quick-tour-body" className="mt-1 text-sm leading-relaxed text-hs-gray">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={finish} className="min-h-11 rounded-xl px-2 text-sm font-semibold text-hs-gray focus:outline-none focus-visible:ring-2 focus-visible:ring-hs-gold">Skip for now</button>
          <button type="button" onClick={() => stepIndex === steps.length - 1 ? finish() : setStepIndex((value) => value + 1)} className="min-h-11 rounded-xl bg-hs-gold px-5 text-sm font-black text-hs-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {stepIndex === steps.length - 1 ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
