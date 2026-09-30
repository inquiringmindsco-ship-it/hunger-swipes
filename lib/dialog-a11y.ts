'use client'

import { useEffect, useRef } from 'react'

export function useDialogA11y(open: boolean, onClose: () => void, options: { focusOnOpen?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      // Basic focus trap
      if (event.key === 'Tab' && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const nodes = Array.from(focusable).filter((el) => !el.hasAttribute('disabled'))
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)

    // Move focus into the dialog after it mounts
    if (options.focusOnOpen !== false) {
      const timer = setTimeout(() => {
        const container = containerRef.current
        if (!container) return
        const focusable = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const nodes = Array.from(focusable).filter((el) => !el.hasAttribute('disabled'))
        const target = nodes[0] || container
        target.focus()
      }, 0)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = originalOverflow
        window.removeEventListener('keydown', onKeyDown)
        // Restore focus when closing
        if (previouslyFocusedRef.current instanceof HTMLElement) {
          previouslyFocusedRef.current.focus()
        }
      }
    }

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [open, onClose, options.focusOnOpen])

  return containerRef
}
