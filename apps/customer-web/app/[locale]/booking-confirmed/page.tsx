'use client'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

export default function BookingConfirmedPage() {
  const t = useTranslations('booking')
  const tOrder = useTranslations('order')
  const locale = useLocale()
  const searchParams = useSearchParams()

  const orderId = searchParams.get('order') ?? ''

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-md">
      <div className="flex flex-col items-center text-center gap-lg max-w-md w-full">
        {/* Confirmation icon */}
        <div
          className="w-20 h-20 rounded-full bg-semantic-success flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-display font-semibold text-brand-navy">
          {t('booking_confirmed_heading')}
        </h1>

        {/* Order number */}
        {orderId && (
          <p className="text-label font-mono text-brand-navy/70">
            {tOrder('order_number', { number: orderId.slice(0, 8).toUpperCase() })}
          </p>
        )}

        {/* View Order link */}
        {orderId && (
          <Link
            href={`/${locale}/orders/${orderId}`}
            className="mt-sm text-body text-brand-navy font-semibold underline underline-offset-2 hover:opacity-80"
          >
            {t('view_order')}
          </Link>
        )}
      </div>
    </div>
  )
}
