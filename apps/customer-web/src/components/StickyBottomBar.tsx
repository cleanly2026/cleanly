'use client'

interface StickyBottomBarProps {
  total: number
  ctaText: string
  onCtaClick: () => void
  disabled: boolean
}

export function StickyBottomBar({ total, ctaText, onCtaClick, disabled }: StickyBottomBarProps) {
  const priceFormatted = `AED ${(total / 100).toFixed(2)}`

  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-50 h-[72px] bg-brand-navy flex items-center justify-between px-lg pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="booking summary"
    >
      {/* CTA button on the leading side */}
      <button
        type="button"
        onClick={onCtaClick}
        disabled={disabled}
        className={[
          'h-[44px] px-lg rounded-full text-label font-semibold transition-colors',
          disabled
            ? 'bg-brand-muted text-brand-navy/50 pointer-events-none'
            : 'bg-brand-gold text-brand-navy hover:opacity-90',
        ].join(' ')}
        aria-disabled={disabled}
      >
        {ctaText}
      </button>

      {/* Price on the trailing side */}
      <span className="text-label font-semibold text-brand-gold" dir="ltr">
        {priceFormatted}
      </span>
    </div>
  )
}
