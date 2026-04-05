'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminFetch } from '../../../../src/lib/api'
import { StatusBadge } from '../../../../src/components/status-badge'
import { DisputePhotoViewer } from '../../../../src/components/dispute-photo-viewer'
import { RefundModal } from '../../../../src/components/refund-modal'

interface DisputeOrder {
  id: string
  amount_total: number
  type: string
  created_at: string
  before_photo_url?: string | null
  after_photo_url?: string | null
  customer: {
    id: string
    phone: string
    preferred_language?: string
  }
  company: {
    id: string
    name_en: string
    name_ar?: string
  }
  washer?: {
    id: string
    phone: string
  } | null
}

interface Dispute {
  id: string
  reason: string
  note?: string | null
  status: 'open' | 'resolved'
  resolution?: string | null
  created_at: string
  order: DisputeOrder
}

function BackArrow({ locale }: { locale: string }) {
  const isRtl = locale === 'ar'
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function formatOrderId(id: string): string {
  return `CLN-${id.slice(0, 8).toUpperCase()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAed(fils: number): string {
  return `AED ${(fils / 100).toFixed(2)}`
}

export default function DisputeDetailPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const id = params?.id as string

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchDispute = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminFetch<Dispute>(`/api/admin/disputes/${id}`)
      setDispute(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      void fetchDispute()
    }
  }, [fetchDispute, id])

  async function handleMarkResolved() {
    if (!dispute) return
    setResolving(true)
    setError(null)
    try {
      const updated = await adminFetch<Dispute>(`/api/admin/disputes/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      setDispute(updated)
      setSuccessMessage('Dispute marked as resolved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark dispute as resolved.')
    } finally {
      setResolving(false)
    }
  }

  async function handleRefundConfirm(
    type: 'full' | 'partial',
    amount: number | null,
    reason: string
  ) {
    const body: { type: string; reason: string; amount?: number } = { type, reason }
    if (type === 'partial' && amount !== null) {
      body.amount = amount
    }
    await adminFetch(`/api/admin/refunds/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setRefundModalOpen(false)
    setSuccessMessage('Refund issued successfully. The dispute has been resolved.')
    // Refresh dispute to get updated status
    void fetchDispute()
  }

  if (isLoading) {
    return (
      <div className="space-y-lg animate-pulse max-w-3xl">
        <div className="h-5 bg-brand-muted rounded w-32" />
        <div className="h-8 bg-brand-muted rounded w-64" />
        <div className="h-40 bg-brand-muted rounded" />
        <div className="h-80 bg-brand-muted rounded" />
      </div>
    )
  }

  if (!dispute) {
    return (
      <div className="text-center py-2xl">
        <p className="text-heading font-semibold text-gray-400">Dispute not found.</p>
        <Link
          href={`/${locale}/disputes`}
          className="text-brand-gold underline mt-md inline-block"
        >
          Back to Disputes
        </Link>
      </div>
    )
  }

  const { order } = dispute
  const isResolved = dispute.status === 'resolved'

  return (
    <div className="space-y-lg max-w-3xl">
      {/* Back link */}
      <Link
        href={`/${locale}/disputes`}
        className="inline-flex items-center gap-xs text-label text-brand-navy hover:text-brand-gold transition-colors"
      >
        <BackArrow locale={locale} />
        <span>Back to Disputes</span>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-md flex-wrap">
        <div>
          <h1 className="text-display font-semibold text-brand-navy">
            {formatOrderId(order.id)}
          </h1>
          <p className="text-label text-gray-500 mt-xs">Dispute filed {formatDate(dispute.created_at)}</p>
        </div>
        <StatusBadge status={dispute.status} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
          <p className="text-semantic-destructive text-body">{error}</p>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="border-s-4 border-semantic-success bg-semantic-success/5 px-md py-sm rounded">
          <p className="text-semantic-success text-body">{successMessage}</p>
        </div>
      )}

      {/* Order info summary */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Order Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div>
            <p className="text-label font-semibold text-gray-500">Customer Phone</p>
            <p className="text-body text-brand-navy font-mono" dir="ltr">{order.customer.phone}</p>
          </div>
          {order.washer && (
            <div>
              <p className="text-label font-semibold text-gray-500">Washer Phone</p>
              <p className="text-body text-brand-navy font-mono" dir="ltr">{order.washer.phone}</p>
            </div>
          )}
          <div>
            <p className="text-label font-semibold text-gray-500">Company</p>
            <p className="text-body text-brand-navy">{order.company.name_en}</p>
          </div>
          <div>
            <p className="text-label font-semibold text-gray-500">Order Date</p>
            <p className="text-body text-brand-navy">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-label font-semibold text-gray-500">Order Type</p>
            <p className="text-body text-brand-navy capitalize">{order.type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-label font-semibold text-gray-500">Order Amount</p>
            <p className="text-body text-brand-navy">{formatAed(order.amount_total)}</p>
          </div>
        </div>
      </div>

      {/* Photo viewer */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Service Photos
        </h2>
        <DisputePhotoViewer
          beforePhotoUrl={order.before_photo_url ?? null}
          afterPhotoUrl={order.after_photo_url ?? null}
        />
      </div>

      {/* Dispute details */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Dispute Details
        </h2>

        <div>
          <p className="text-label font-semibold text-gray-500 mb-xs">Dispute Reason</p>
          <StatusBadge
            status={dispute.status === 'open' ? 'open' : 'resolved'}
            label={dispute.reason.replace(/_/g, ' ')}
          />
        </div>

        {dispute.note && (
          <div>
            <p className="text-label font-semibold text-gray-500 mb-xs">Customer Note</p>
            <p className="text-body text-brand-navy bg-brand-muted/30 rounded-lg p-md">{dispute.note}</p>
          </div>
        )}

        {isResolved && dispute.resolution && (
          <div>
            <p className="text-label font-semibold text-gray-500 mb-xs">Resolution</p>
            <p className="text-body text-brand-navy bg-semantic-success/5 border-s-4 border-semantic-success rounded-lg p-md">
              {dispute.resolution}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons — hidden when resolved */}
      {!isResolved && (
        <div className="flex gap-md flex-wrap">
          <button
            type="button"
            onClick={() => setRefundModalOpen(true)}
            className="px-lg py-sm bg-semantic-destructive text-white font-semibold rounded-lg hover:bg-semantic-destructive/90 transition-colors"
          >
            Issue Refund
          </button>
          <button
            type="button"
            onClick={() => void handleMarkResolved()}
            disabled={resolving}
            className="px-lg py-sm border border-brand-navy text-brand-navy font-semibold rounded-lg hover:bg-brand-muted/50 transition-colors disabled:opacity-40"
          >
            {resolving ? 'Resolving...' : 'Mark as Resolved'}
          </button>
        </div>
      )}

      {/* Refund modal */}
      <RefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onConfirm={handleRefundConfirm}
        orderTotal={order.amount_total}
      />
    </div>
  )
}
