'use client'
import { Car, Layers, Scissors } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ServiceCategory = 'car_wash' | 'carpet' | 'sofa'

interface CategoryCardProps {
  category: ServiceCategory
  selected: boolean
  onSelect: () => void
}

const CATEGORY_ICONS: Record<ServiceCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  car_wash: Car,
  carpet: Layers,
  sofa: Scissors,
}

export function CategoryCard({ category, selected, onSelect }: CategoryCardProps) {
  const t = useTranslations('discovery')
  const Icon = CATEGORY_ICONS[category]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex flex-col items-center justify-center gap-sm rounded-xl border-2 p-md min-h-[44px] w-full transition-colors',
        selected
          ? 'border-brand-gold bg-brand-navy text-white'
          : 'border-brand-muted bg-brand-surface text-brand-navy hover:border-brand-gold/50',
      ].join(' ')}
      aria-pressed={selected}
    >
      <Icon size={28} className="shrink-0" />
      <span className="text-heading font-semibold text-center leading-tight">
        {t(`categories.${category}`)}
      </span>
    </button>
  )
}
