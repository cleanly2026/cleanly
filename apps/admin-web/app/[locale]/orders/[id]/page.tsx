'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminFetch } from '../../../../src/lib/api'
import { StatusBadge } from '../../../../src/components/status-badge'

interface OrderItem {
  id: string
  package_name: string
  quantity: number
  unit_price: number
}

interface CarpetDetails {
  return_date?: string | null
  pickup_time?: string | null
  carpet_count?: number | null
}

interface OrderDispute {
  id: string
  reason: string
  status: string
}

interface OrderDetail {
  id: string
  type: string
  status: string
  amount_total: number
  subtotal?: number
  platform_fee?: number
  before_photo_url?: string | null
  after_photo_url?: string | null
  created_at: string
  customer: {
    id: string
    phone: string
    preferred_language?: string
  }
  company: {
    id: string
    name_en: string
    name_ar?: string
    stripe_connect_status?: string | null
  }
  washer?: {
    id: string
    phone: string
  } | null
  items?: OrderItem[]
  carpet_details?: CarpetDetails | null
  dispute?: OrderDispute | null
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

interface InfoRowProps {
  label: string
  value: React.ReactNode
  dir?: 'ltr' | 'rtl'
}

function InfoRow({ label, value, dir }: InfoRowProps) {
  return (
    <div>
      <p className="text-label font-semibold text-gray-500">{label}</p>
      <p className="text-body text-brand-navy" dir={dir}>{value}</p>
    </div>
  )
}

interface PhotoPairProps {
  beforeUrl?: string | null
  afterUrl?: string | null
}

function PhotoPair({ beforeUrl, afterUrl }: PhotoPairProps) {
  if (!beforeUrl && !afterUrl) return null

  return (
    <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
      <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
        Service Photos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {(['Before', 'After'] as const).map((label) => {
          const url = label === 'Before' ? beforeUrl : afterUrl
          return (
            <div key={label} className="space-y-xs">
              <p className="text-label font-semibold text-gray-500">{label}</p>
              {url ? (
                <img
                  src={url}
                  alt={`${label} photo`}
                  className="w-full min-h-[200px] object-cover rounded-md"
                />
              ) : (
                <div className="flex items-center justify-center min-h-[200px] bg-brand-muted/50 rounded-md">
                  <p className="text-label text-gray-400">Photo unavailable</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const id = params?.id as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminFetch<OrderDetail>(`/api/admin/orders/${id}`)
      setOrder(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) void fetchOrder()
  }, [fetchOrder, id])

  if (isLoading) {
    return (
      <div className="space-y-lg animate-pulse max-w-3xl">
        <div className="h-5 bg-brand-muted rounded w-32" />
        <div className="h-8 bg-brand-muted rounded w-64" />
        <div className="h-48 bg-brand-muted rounded" />
        <div className="h-48 bg-brand-muted rounded" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-2xl">
        {error && (
          <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded mb-md max-w-md mx-auto">
            <p className="text-semantic-destructive text-body">{error}</p>
          </div>
        )}
        <p className="text-heading font-semibold text-gray-400">Order not found.</p>
        <Link href={`/${locale}/orders`} className="text-brand-gold underline mt-md inline-block">
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-lg max-w-3xl">
      {/* Back link */}
      <Link
        href={`/${locale}/orders`}
        className="inline-flex items-center gap-xs text-label text-brand-navy hover:text-brand-gold transition-colors"
      >
        <BackArrow locale={locale} />
        <span>Back to Orders</span>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-md flex-wrap">
        <div>
          <h1 className="text-display font-semibold text-brand-navy">
            {formatOrderId(order.id)}
          </h1>
          <p className="text-label text-gray-500 mt-xs">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <span className="inline-flex items-center px-sm py-xs rounded-full text-label font-semibold bg-brand-muted text-gray-600 capitalize">
            {order.type.replace(/_/g, ' ')}
          </span>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
          <p className="text-semantic-destructive text-body">{error}</p>
        </div>
      )}

      {/* Customer */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Customer
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <InfoRow label="Phone" value={order.customer.phone} dir="ltr" />
          {order.customer.preferred_language && (
            <InfoRow label="Preferred Language" value={order.customer.preferred_language.toUpperCase()} />
          )}
        </div>
      </div>

      {/* Company */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Company
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <InfoRow label="Name (EN)" value={order.company.name_en} />
          {order.company.name_ar && (
            <InfoRow label="Name (AR)" value={order.company.name_ar} dir="rtl" />
          )}
          {order.company.stripe_connect_status && (
            <InfoRow label="Stripe Status" value={order.company.stripe_connect_status} />
          )}
        </div>
      </div>

      {/* Washer */}
      {order.washer && (
        <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
          <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
            Washer
          </h2>
          <InfoRow label="Phone" value={order.washer.phone} dir="ltr" />
        </div>
      )}

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
          <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
            Items
          </h2>
          <div className="space-y-sm">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-sm border-b border-brand-muted last:border-0"
              >
                <div>
                  <p className="text-body text-brand-navy">{item.package_name}</p>
                  <p className="text-label text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-body text-brand-navy font-semibold">
                  {formatAed(item.unit_price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Payment
        </h2>
        <div className="space-y-sm">
          {order.subtotal !== undefined && (
            <div className="flex justify-between">
              <span className="text-body text-gray-500">Subtotal</span>
              <span className="text-body text-brand-navy" dir="ltr">{formatAed(order.subtotal)}</span>
            </div>
          )}
          {order.platform_fee !== undefined && (
            <div className="flex justify-between">
              <span className="text-body text-gray-500">Platform Fee</span>
              <span className="text-body text-brand-navy" dir="ltr">{formatAed(order.platform_fee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-brand-muted pt-sm">
            <span className="text-body font-semibold text-brand-navy">Total</span>
            <span className="text-body font-semibold text-brand-navy" dir="ltr">
              {formatAed(order.amount_total)}
            </span>
          </div>
        </div>
      </div>

      {/* Carpet details */}
      {order.type === 'carpet' && order.carpet_details && (
        <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
          <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
            Carpet Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {order.carpet_details.carpet_count != null && (
              <InfoRow label="Carpet Count" value={String(order.carpet_details.carpet_count)} />
            )}
            {order.carpet_details.pickup_time && (
              <InfoRow label="Pickup Time" value={formatDate(order.carpet_details.pickup_time)} />
            )}
            {order.carpet_details.return_date && (
              <InfoRow label="Return Date" value={formatDate(order.carpet_details.return_date)} />
            )}
          </div>
        </div>
      )}

      {/* Photos */}
      <PhotoPair beforeUrl={order.before_photo_url} afterUrl={order.after_photo_url} />

      {/* Dispute */}
      {order.dispute && (
        <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
          <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
            Dispute
          </h2>
          <div className="flex items-center gap-md flex-wrap">
            <div className="flex-1 space-y-xs">
              <p className="text-label font-semibold text-gray-500">Reason</p>
              <p className="text-body text-brand-navy capitalize">
                {order.dispute.reason.replace(/_/g, ' ')}
              </p>
            </div>
            <StatusBadge status={order.dispute.status} />
          </div>
          <Link
            href={`/${locale}/disputes/${order.dispute.id}`}
            className="inline-flex items-center gap-xs text-label text-brand-gold hover:underline"
          >
            View dispute details →
          </Link>
        </div>
      )}
    </div>
  )
}
