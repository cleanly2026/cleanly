'use client'

import { useState } from 'react'

interface RejectReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  companyName: string
}

export function RejectReasonModal({
  isOpen,
  onClose,
  onConfirm,
  companyName,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const canSubmit = reason.trim().length >= 5

  async function handleConfirm() {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject company')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (isSubmitting) return
    setReason('')
    setError(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-navy/60"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-md p-xl flex flex-col gap-md">
        <h2
          id="reject-modal-title"
          className="text-heading font-semibold text-brand-navy"
        >
          Reject Company Application
        </h2>

        <p className="text-body text-gray-600">
          Provide a reason for rejection. This will be sent to the company admin.
        </p>

        {error && (
          <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-sm py-xs rounded">
            <p className="text-label text-semantic-destructive">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-xs">
          <label htmlFor="reject-reason" className="text-label font-semibold text-brand-navy">
            Reason <span className="text-semantic-destructive" aria-hidden="true">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason..."
            disabled={isSubmitting}
            className="w-full border border-brand-muted rounded-lg px-sm py-sm text-body resize-none focus:outline-none focus:ring-2 focus:ring-brand-gold disabled:opacity-50"
          />
          <p className="text-label text-gray-400">Minimum 5 characters</p>
        </div>

        <div className="flex gap-sm justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-lg py-sm border border-brand-muted rounded-lg text-label font-semibold text-gray-600 hover:bg-brand-muted/50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canSubmit || isSubmitting}
            className="px-lg py-sm bg-semantic-destructive text-white rounded-lg text-label font-semibold hover:bg-semantic-destructive/90 transition-colors disabled:opacity-40 flex items-center gap-xs"
          >
            {isSubmitting && (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  )
}
