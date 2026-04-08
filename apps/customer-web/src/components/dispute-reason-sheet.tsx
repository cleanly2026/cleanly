'use client'
import { useState } from 'react'
import { apiFetch } from '@/src/lib/api'

const DISPUTE_REASONS = [
  { value: 'quality_issue', label: 'Service quality not as expected' },
  { value: 'photo_mismatch', label: "Photos don't match the service" },
  { value: 'wrong_items', label: 'Wrong items cleaned' },
  { value: 'unprofessional', label: 'Washer was rude or unprofessional' },
  { value: 'other', label: 'Other' },
] as const

interface DisputeReasonSheetProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
}

export function DisputeReasonSheet({ isOpen, onClose, orderId }: DisputeReasonSheetProps) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  async function handleSubmit() {
    if (!reason) return
    setStatus('submitting')
    try {
      await apiFetch('/disputes', {
        method: 'POST',
        body: { order_id: orderId, reason, note: note || undefined },
      })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Could not submit your report. Please try again or contact support.')
    }
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-xl">
          <p className="text-center text-brand-navy font-semibold text-lg mb-md">
            Your report has been received. Our team will review it within 24 hours.
          </p>
          <button onClick={onClose} className="w-full py-sm bg-brand-gold text-white rounded-lg font-semibold">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-xl">
        <h2 className="text-xl font-semibold text-brand-navy mb-lg">What went wrong?</h2>

        <div className="space-y-sm mb-lg">
          {DISPUTE_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-sm cursor-pointer">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-brand-gold"
              />
              <span className="text-sm">{r.label}</span>
            </label>
          ))}
        </div>

        <div className="mb-lg">
          <label className="text-sm text-brand-navy/70 mb-xs block">Additional details (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the issue to help us resolve it quickly"
            className="w-full border rounded-lg p-sm text-sm resize-none h-20"
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-semantic-destructive mb-sm">{errorMessage}</p>
        )}

        <div className="flex gap-sm">
          <button onClick={onClose} className="flex-1 py-sm border rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || status === 'submitting'}
            className="flex-1 py-sm bg-brand-gold text-white rounded-lg font-semibold text-sm disabled:opacity-50"
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
