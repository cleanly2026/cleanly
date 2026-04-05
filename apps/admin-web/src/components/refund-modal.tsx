'use client'

import { useState } from 'react'

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (type: 'full' | 'partial', amount: number | null, reason: string) => Promise<void>
  orderTotal: number // in fils (smallest currency unit, e.g. AED fils)
}

export function RefundModal({ isOpen, onClose, onConfirm, orderTotal }: RefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [partialAmountAed, setPartialAmountAed] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const orderTotalAed = orderTotal / 100
  const partialAedNum = parseFloat(partialAmountAed) || 0
  const remainingAed = orderTotalAed - partialAedNum

  const isReasonValid = reason.trim().length >= 10
  const isPartialValid =
    refundType === 'full' ||
    (partialAedNum > 0 && partialAedNum <= orderTotalAed)
  const canSubmit = isReasonValid && isPartialValid && !isSubmitting

  async function handleSubmit() {
    setIsSubmitting(true)
    setError(null)
    try {
      const amountFils =
        refundType === 'full' ? null : Math.round(partialAedNum * 100)
      await onConfirm(refundType, amountFils, reason.trim())
      // Reset form
      setRefundType('full')
      setPartialAmountAed('')
      setReason('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Refund could not be processed. Check Stripe dashboard and try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (isSubmitting) return
    setError(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-md bg-brand-navy/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-xl space-y-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 id="refund-modal-title" className="text-heading font-semibold text-brand-navy">
          Issue Refund
        </h2>

        {/* Error */}
        {error && (
          <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
            <p className="text-semantic-destructive text-label">{error}</p>
          </div>
        )}

        {/* Radio group */}
        <fieldset className="space-y-sm">
          <legend className="text-label font-semibold text-gray-500 mb-sm">Refund type</legend>

          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="radio"
              name="refund-type"
              value="full"
              checked={refundType === 'full'}
              onChange={() => setRefundType('full')}
              className="accent-brand-gold"
            />
            <span className="text-body text-brand-navy">
              Full refund — AED {orderTotalAed.toFixed(2)}
            </span>
          </label>

          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="radio"
              name="refund-type"
              value="partial"
              checked={refundType === 'partial'}
              onChange={() => setRefundType('partial')}
              className="accent-brand-gold"
            />
            <span className="text-body text-brand-navy">Partial refund</span>
          </label>
        </fieldset>

        {/* Partial amount input */}
        {refundType === 'partial' && (
          <div className="space-y-xs">
            <label htmlFor="partial-amount" className="block text-label font-semibold text-gray-500">
              Amount (AED)
            </label>
            <input
              id="partial-amount"
              type="number"
              min="0.01"
              max={orderTotalAed}
              step="0.01"
              value={partialAmountAed}
              onChange={(e) => setPartialAmountAed(e.target.value)}
              placeholder="0.00"
              className="w-full border border-brand-muted rounded-lg px-md py-sm text-body focus:outline-none focus:ring-2 focus:ring-brand-gold"
              dir="ltr"
            />
            {partialAedNum > 0 && (
              <p className="text-label text-gray-500">
                Remaining: AED {Math.max(0, remainingAed).toFixed(2)}
              </p>
            )}
            {partialAedNum > orderTotalAed && (
              <p className="text-label text-semantic-destructive">
                Amount cannot exceed AED {orderTotalAed.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Reason textarea */}
        <div className="space-y-xs">
          <label htmlFor="refund-reason" className="block text-label font-semibold text-gray-500">
            Reason (required)
          </label>
          <textarea
            id="refund-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue and why a refund is being issued"
            className="w-full border border-brand-muted rounded-lg px-md py-sm text-body resize-none focus:outline-none focus:ring-2 focus:ring-brand-gold"
          />
          {reason.length > 0 && reason.length < 10 && (
            <p className="text-label text-semantic-destructive">
              Reason must be at least 10 characters.
            </p>
          )}
        </div>

        {/* Warning */}
        <p className="text-label text-semantic-warning bg-semantic-warning/10 px-md py-sm rounded-lg">
          This action cannot be undone. The refund will be issued within 5-10 business days.
        </p>

        {/* Buttons */}
        <div className="flex gap-md flex-wrap">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-sm px-lg py-sm bg-semantic-destructive text-white font-semibold rounded-lg hover:bg-semantic-destructive/90 transition-colors disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                </svg>
                Processing...
              </>
            ) : (
              'Confirm Refund'
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-lg py-sm border border-brand-muted text-brand-navy font-semibold rounded-lg hover:bg-brand-muted/50 transition-colors disabled:opacity-40"
          >
            Keep Dispute Open
          </button>
        </div>
      </div>
    </div>
  )
}
