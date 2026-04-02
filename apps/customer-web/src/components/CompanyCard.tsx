'use client'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface CompanyListItem {
  id: string
  name_en: string
  name_ar: string
  slug: string
  logo_url: string | null
  avg_rating: number
  review_count: number
  starting_price: number
  city_id: string
}

interface CompanyCardProps {
  company: CompanyListItem
}

function StarRating({ avg_rating, className }: { avg_rating: number; className?: string }) {
  return (
    <span className={`flex items-center gap-xs ${className ?? ''}`} aria-label={`${avg_rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= Math.round(avg_rating) ? 'fill-brand-gold text-brand-gold' : 'fill-brand-muted text-brand-muted'}
        />
      ))}
    </span>
  )
}

export function CompanyCard({ company }: CompanyCardProps) {
  const t = useTranslations('discovery')
  const locale = useLocale()

  const name = locale === 'ar' ? company.name_ar : company.name_en
  const initials = name.slice(0, 2).toUpperCase()
  const priceAed = (company.starting_price / 100).toFixed(2)

  return (
    <Link
      href={`/companies/${company.slug}`}
      className="block bg-white rounded-xl border border-brand-muted p-md mb-lg hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-md">
        {/* Company logo / avatar */}
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt={name}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full bg-brand-navy text-white flex items-center justify-center text-label font-semibold shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
        )}

        {/* Company info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-heading font-semibold text-brand-navy truncate">{name}</h3>

          {/* Rating row */}
          <div className="flex items-center gap-sm mt-xs">
            <StarRating avg_rating={company.avg_rating} />
            <span className="text-label text-brand-navy/60">
              {company.avg_rating.toFixed(1)} ({company.review_count})
            </span>
          </div>

          {/* Starting price */}
          <p className="text-body text-brand-navy/80 mt-xs">
            {t('company_listing_starting_from')}{' '}
            <span className="font-semibold">AED {priceAed}</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
