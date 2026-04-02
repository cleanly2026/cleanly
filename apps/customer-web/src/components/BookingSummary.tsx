'use client'
import { useTranslations } from 'next-intl'

interface AddOnLine {
  name: string
  price: number
}

interface BookingSummaryProps {
  packageName: string
  packagePrice: number
  quantity: number
  addOns: AddOnLine[]
  platformFee: number
  total: number
}

function formatAed(fils: number): string {
  return `AED ${(fils / 100).toFixed(2)}`
}

export function BookingSummary({
  packageName,
  packagePrice,
  quantity,
  addOns,
  platformFee,
  total,
}: BookingSummaryProps) {
  const t = useTranslations('booking')

  return (
    <div className="bg-white border border-brand-muted rounded-xl p-md">
      <h3 className="text-heading font-semibold text-brand-navy mb-md">
        {t('order_summary')}
      </h3>

      <div className="flex flex-col gap-sm">
        {/* Package line */}
        <div className="flex items-center justify-between">
          <span className="text-body text-brand-navy">
            {packageName}
            {quantity > 1 && (
              <span className="text-label text-brand-navy/60 ms-xs">× {quantity}</span>
            )}
          </span>
          <span className="text-body text-brand-navy">{formatAed(packagePrice * quantity)}</span>
        </div>

        {/* Add-on lines */}
        {addOns.map((addOn, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-body text-brand-navy">{addOn.name}</span>
            <span className="text-body text-brand-navy">{formatAed(addOn.price)}</span>
          </div>
        ))}

        {/* Divider */}
        <div className="h-px bg-brand-muted my-xs" role="separator" />

        {/* Service fee */}
        <div className="flex items-center justify-between">
          <span className="text-label text-brand-navy/70">{t('service_fee_label')}</span>
          <span className="text-label text-brand-navy/70">{formatAed(platformFee)}</span>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-body font-semibold text-brand-navy">{t('total')}</span>
          <span className="text-body font-semibold text-brand-navy">{formatAed(total)}</span>
        </div>
      </div>
    </div>
  )
}
