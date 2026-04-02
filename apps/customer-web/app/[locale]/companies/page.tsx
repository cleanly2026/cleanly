'use client'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { CompanyCard } from '@/src/components/CompanyCard'
import { apiFetch } from '@/src/lib/api'

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

interface CompaniesResponse {
  companies: CompanyListItem[]
  page: number
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-brand-muted p-md mb-lg animate-pulse">
      <div className="flex items-start gap-md">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 rounded-full bg-brand-muted shrink-0" />
        <div className="flex-1 space-y-sm">
          {/* Name */}
          <div className="h-5 bg-brand-muted rounded w-3/4" />
          {/* Rating */}
          <div className="h-4 bg-brand-muted rounded w-1/2" />
          {/* Price */}
          <div className="h-4 bg-brand-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

export default function CompaniesPage() {
  const t = useTranslations('discovery')
  const locale = useLocale()
  const searchParams = useSearchParams()

  const city_id = searchParams.get('city_id') ?? ''
  const category = searchParams.get('category') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const { data, isLoading, isError } = useQuery<CompaniesResponse>({
    queryKey: ['companies', city_id, category, page],
    queryFn: () =>
      apiFetch(`/companies?city_id=${encodeURIComponent(city_id)}&category=${encodeURIComponent(category)}&page=${page}`),
    enabled: Boolean(city_id && category),
  })

  const companies = data?.companies ?? []

  // Derive city name for empty state (city_id from URL, we don't have the name here so fallback to id)
  const cityLabel = city_id

  return (
    <main className="min-h-screen bg-brand-surface px-md py-xl">
      {/* Category heading */}
      <h1 className="text-display font-semibold text-brand-navy mb-xl">
        {t(`categories.${category as 'car_wash' | 'carpet' | 'sofa'}`) || category}
      </h1>

      {/* Loading: 3 skeleton cards */}
      {isLoading && (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <p className="text-body text-semantic-destructive">
          {t('gps_unavailable')}
        </p>
      )}

      {/* Company listing */}
      {!isLoading && !isError && companies.length > 0 && (
        <div>
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && companies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-3xl text-center">
          {/* Illustrated empty state placeholder */}
          <div
            className="w-24 h-24 rounded-full bg-brand-muted mb-xl flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-3xl">🧹</span>
          </div>
          <h2 className="text-heading font-semibold text-brand-navy mb-sm">
            {t('no_companies_heading', { city: cityLabel })}
          </h2>
          <p className="text-body text-brand-navy/60 max-w-xs">
            {t('no_companies_body')}
          </p>
        </div>
      )}
    </main>
  )
}
