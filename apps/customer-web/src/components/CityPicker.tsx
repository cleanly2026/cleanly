'use client'
import { Check, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface City {
  id: string
  name_en: string
  name_ar: string
  country: string
}

interface CityPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (cityId: string) => void
  cities: City[]
  selectedCityId?: string | null
}

export function CityPicker({ open, onClose, onSelect, cities, selectedCityId }: CityPickerProps) {
  const t = useTranslations('discovery')
  const locale = useLocale()

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-brand-navy/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — bottom on mobile, centered modal on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('city_picker_title')}
        className={[
          'fixed z-50 bg-white shadow-xl',
          // Mobile: bottom sheet
          'bottom-0 start-0 end-0 rounded-t-2xl',
          // Desktop: centered modal
          'sm:bottom-auto sm:top-1/2 sm:start-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[360px] sm:rounded-2xl',
          'max-h-[70vh] flex flex-col',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-brand-muted">
          <h2 className="text-heading font-semibold text-brand-navy">
            {t('city_picker_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-navy/60 hover:text-brand-navy p-xs rounded-lg"
            aria-label="Close city picker"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable city list */}
        <ul className="overflow-y-auto flex-1 py-sm" role="listbox">
          {cities.map((city) => {
            const isSelected = city.id === selectedCityId
            return (
              <li key={city.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(city.id)
                    onClose()
                  }}
                  className={[
                    'w-full flex items-center justify-between px-lg py-md min-h-[44px] text-start transition-colors',
                    isSelected
                      ? 'bg-brand-surface text-brand-navy font-semibold'
                      : 'text-brand-navy hover:bg-brand-surface',
                  ].join(' ')}
                >
                  <span className="text-body">
                    {locale === 'ar' ? city.name_ar : city.name_en}
                  </span>
                  {isSelected && (
                    <Check size={18} className="text-brand-gold shrink-0 ms-sm" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
