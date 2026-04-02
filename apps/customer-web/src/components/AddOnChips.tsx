'use client'
import { Check } from 'lucide-react'

interface AddOn {
  id: string
  name_en: string
  name_ar: string
  price: number
}

interface AddOnChipsProps {
  addOns: AddOn[]
  selected: string[]
  onToggle: (id: string) => void
  locale: string
}

export function AddOnChips({ addOns, selected, onToggle, locale }: AddOnChipsProps) {
  if (addOns.length === 0) return null

  return (
    <div className="flex flex-wrap gap-sm">
      {addOns.map((addOn) => {
        const isSelected = selected.includes(addOn.id)
        const name = locale === 'ar' ? addOn.name_ar : addOn.name_en
        const priceAed = (addOn.price / 100).toFixed(2)

        return (
          <button
            key={addOn.id}
            type="button"
            onClick={() => onToggle(addOn.id)}
            aria-pressed={isSelected}
            className={[
              'flex items-center gap-xs px-md min-h-[44px] rounded-full text-label transition-colors',
              isSelected
                ? 'bg-brand-navy text-white'
                : 'bg-brand-muted text-brand-navy',
            ].join(' ')}
          >
            {isSelected && <Check size={16} className="shrink-0" aria-hidden="true" />}
            <span>{name}</span>
            <span className="ms-xs opacity-80">+ AED {priceAed}</span>
          </button>
        )
      })}
    </div>
  )
}
