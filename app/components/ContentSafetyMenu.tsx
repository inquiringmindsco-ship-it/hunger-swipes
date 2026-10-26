'use client'

import { useState } from 'react'
import { Flag, MoreHorizontal, UserX, X } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { useDialogA11y } from '@/lib/dialog-a11y'

const REASONS = [
  ['not_food', 'Not food or misleading'],
  ['offensive', 'Offensive or unsafe'],
  ['spam', 'Spam'],
  ['impersonation', 'Impersonation'],
  ['other', 'Something else'],
] as const

export default function ContentSafetyMenu({ postId, creatorUserId, onBlocked }: { postId: string; creatorUserId: string; onBlocked: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const close = () => { if (!busy) setOpen(false) }
  const dialogRef = useDialogA11y(open, close)

  const report = async () => {
    if (!reason) return setMessage('Choose a reason first.')
    setBusy(true); setMessage('')
    const response = await authFetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: postId, reason, details }) })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return setMessage(data.error || 'Could not send report')
    setMessage('Report sent to Hunger Swipes for review.')
  }

  const block = async () => {
    setBusy(true); setMessage('')
    const response = await authFetch('/api/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blockedUserId: creatorUserId }) })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return setMessage(data.error || 'Could not block creator')
    setOpen(false)
    onBlocked()
  }

  return (
    <>
      <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setOpen(true) }} className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm" aria-label="Report or block this community post"><MoreHorizontal size={20} /></button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4" onClick={close}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="safety-menu-title" onClick={(event) => event.stopPropagation()} className="safe-bottom w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-hs-charcoal p-5 shadow-card-lg outline-none">
            <div className="flex items-center justify-between gap-3">
              <div><h2 id="safety-menu-title" className="text-lg font-black text-hs-cream">Keep Hunger Swipes safe</h2><p className="mt-1 text-xs text-hs-gray">Reports are private. The creator will not see who reported them.</p></div>
              <button type="button" onClick={close} className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-hs-soft text-hs-cream" aria-label="Close"><X size={20} /></button>
            </div>
            <fieldset className="mt-4 space-y-2"><legend className="mb-2 text-sm font-bold text-hs-cream">Why are you reporting this?</legend>{REASONS.map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-xl bg-hs-soft px-3 text-sm text-hs-cream"><input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-hs-gold" />{label}</label>)}</fieldset>
            {reason === 'other' && <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={2} placeholder="Tell us what happened" className="mt-3 w-full rounded-xl border border-white/10 bg-hs-soft px-3 py-3 text-sm text-hs-cream placeholder:text-hs-muted" />}
            {message && <p role="status" className="mt-3 text-sm text-hs-gold">{message}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={block} disabled={busy} className="min-h-12 rounded-xl border border-hs-red/30 px-3 text-sm font-bold text-hs-red disabled:opacity-50"><UserX size={17} className="mr-1 inline" /> Block creator</button>
              <button type="button" onClick={report} disabled={busy || !reason} className="min-h-12 rounded-xl bg-hs-gold px-3 text-sm font-black text-hs-black disabled:opacity-50"><Flag size={17} className="mr-1 inline" /> Report</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
