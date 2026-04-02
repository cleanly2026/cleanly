'use client'
import { useTranslations } from 'next-intl'

const TIME_SLOTS = ['9-11', '11-1', '1-3', '3-5']

interface TimeSlotPickerProps {
  selectedDate: string
  selectedSlot: string | null
  onDateChange: (date: string) => void
  onSlotChange: (slot: string) => void
  estimatedReturnDate?: string
}

export function TimeSlotPicker({
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  estimatedReturnDate,
}: TimeSlotPickerProps) {
  const t = useTranslations('booking')

  // Minimum date is today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col gap-md">
      {/* Date picker */}
      <div className="flex flex-col gap-xs">
        <label className="text-label font-semibold text-brand-navy">
          {t('carpet_pickup_date')}
        </label>
        <input
          type="date"
          value={selectedDate}
          min={today}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-md py-sm border border-brand-muted rounded-lg text-body text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
          dir="ltr"
        />
      </div>

      {/* Time slot grid */}
      <div className="flex flex-col gap-xs">
        <label className="text-label font-semibold text-brand-navy">
          {t('carpet_pickup_time')}
        </label>
        <div className="grid grid-cols-4 gap-sm">
          {TIME_SLOTS.map((slot) => {
            const isActive = selectedSlot === slot
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onSlotChange(slot)}
                aria-pressed={isActive}
                className={[
                  'flex items-center justify-center min-h-[44px] rounded-lg text-label font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-navy text-white'
                    : 'bg-brand-muted text-brand-navy hover:bg-brand-navy/10',
                ].join(' ')}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </div>

      {/* Estimated return date */}
      {estimatedReturnDate && (
        <p className="text-label text-brand-navy/70">
          {t('carpet_estimated_return', { date: estimatedReturnDate })}
        </p>
      )}
    </div>
  )
}
