'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { BookingSummary } from '@/src/components/BookingSummary'
import { apiFetch } from '@/src/lib/api'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

interface OrderSummary {
  id: string
  package_name_en: string
  package_name_ar: string
  quantity: number
  amount_subtotal: number
  platform_fee: number
  amount_total: number
  add_ons: Array<{ name_en: string; name_ar: string; price: number }>
}

function PaymentForm({ orderId }: { orderId: string }) {
  const t = useTranslations('booking')
  const locale = useLocale()
  const stripe = useStripe()
  const elements = useElements()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const { data: order, isLoading } = useQuery<OrderSummary>({
    queryKey: ['order', orderId],
    queryFn: () => apiFetch<OrderSummary>(`/orders/${orderId}`),
    enabled: !!orderId,
  })

  async function handleConfirmPay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsSubmitting(true)
    setPaymentError(null)

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${origin}/${locale}/booking-confirmed?order=${orderId}`,
      },
    })

    if (error) {
      setPaymentError(error.message ?? t('payment_failed'))
      setIsSubmitting(false)
    }
    // On success: Stripe redirects to return_url
  }

  const pkgName = order
    ? locale === 'ar'
      ? order.package_name_ar
      : order.package_name_en
    : ''

  const totalAed = order ? (order.amount_total / 100).toFixed(2) : '0.00'

  return (
    <form onSubmit={handleConfirmPay} className="flex flex-col gap-xl">
      {/* Order summary above Stripe element */}
      {isLoading && (
        <div className="h-32 bg-brand-muted rounded-xl animate-pulse" />
      )}
      {order && (
        <BookingSummary
          packageName={pkgName}
          packagePrice={order.amount_subtotal - order.add_ons.reduce((s, a) => s + a.price, 0)}
          quantity={order.quantity}
          addOns={order.add_ons.map((a) => ({
            name: locale === 'ar' ? a.name_ar : a.name_en,
            price: a.price,
          }))}
          platformFee={order.platform_fee}
          total={order.amount_total}
        />
      )}

      {/* Stripe Payment Element — full width, no card wrapper */}
      <PaymentElement options={{ layout: 'tabs' }} />

      {/* Inline payment failure error (D-11: no modal, no toast) */}
      {paymentError && (
        <p className="text-body text-semantic-destructive">{paymentError}</p>
      )}

      {/* Confirm & Pay CTA */}
      <button
        type="submit"
        disabled={!stripe || isSubmitting}
        className={[
          'w-full h-[52px] rounded-full text-heading font-semibold transition-colors',
          !stripe || isSubmitting
            ? 'bg-brand-muted text-brand-navy/50 cursor-not-allowed'
            : 'bg-brand-gold text-brand-navy hover:opacity-90',
        ].join(' ')}
      >
        {t('confirm_pay', { amount: totalAed })}
      </button>
    </form>
  )
}

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const locale = useLocale()

  const orderId = searchParams.get('order_id') ?? ''
  const clientSecret = searchParams.get('client_secret') ?? ''

  const stripeLocale = locale === 'ar' ? 'ar' : 'en'

  if (!clientSecret || !orderId) {
    return (
      <div className="max-w-xl mx-auto px-md py-xl">
        <p className="text-body text-semantic-destructive">Invalid payment session.</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-md py-xl">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          locale: stripeLocale,
          appearance: {
            theme: 'flat',
            variables: {
              colorPrimary: '#C9A84C',
              colorBackground: '#F8F7F4',
              fontFamily: 'Cairo, system-ui, sans-serif',
            },
          },
        }}
      >
        <PaymentForm orderId={orderId} />
      </Elements>
    </div>
  )
}
