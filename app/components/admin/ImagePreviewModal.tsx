'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

export function ImagePreviewModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Full image: ${alt}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] inline-flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white text-black shadow-lg"
        aria-label="Close full image"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-2xl object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}
