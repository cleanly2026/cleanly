'use client'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { CompanyProfile } from '@/src/components/CompanyProfile'
import { apiFetch } from '@/src/lib/api'

interface CompanyData {
  id: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  slug: string
  logo_url: string | null
  avg_rating: number
  review_count: number
  city_id: string
  carpet_lead_time_days: number
  packages: Array<{
    id: string
    category: 'car_wash' | 'carpet' | 'sofa'
    name_en: string
    name_ar: string
    description_en: string
    description_ar: string
    base_price: number
    add_ons: Array<{
      id: string
      name_en: string
      name_ar: string
      price: number
    }>
  }>
  reviews: Array<{
    id: string
    rating: number
    comment: string | null
    created_at: string
  }>
}

function SkeletonHeader() {
  return (
    <div className="animate-pulse px-md py-xl max-w-2xl mx-auto">
      <div className="flex items-start gap-md mb-2xl">
        <div className="w-16 h-16 rounded-full bg-brand-muted shrink-0" />
        <div className="flex-1 space-y-sm">
          <div className="h-7 bg-brand-muted rounded w-2/3" />
          <div className="h-4 bg-brand-muted rounded w-1/3" />
          <div className="h-4 bg-brand-muted rounded w-full" />
        </div>
      </div>
      {/* Package skeletons */}
      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-brand-muted rounded-xl p-md mb-md">
          <div className="h-6 bg-brand-muted rounded w-1/2 mb-sm" />
          <div className="h-4 bg-brand-muted rounded w-full mb-sm" />
          <div className="h-10 bg-brand-muted rounded w-full" />
        </div>
      ))}
    </div>
  )
}

export default function CompanyProfilePage() {
  const t = useTranslations('common')
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const { data: company, isLoading, isError } = useQuery<CompanyData>({
    queryKey: ['company', slug],
    queryFn: () => apiFetch(`/companies/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  })

  if (isLoading) return <SkeletonHeader />

  if (isError || !company) {
    return (
      <main className="min-h-screen bg-brand-surface flex items-center justify-center px-md">
        <p className="text-body text-brand-navy/60">{t('retry')}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-surface">
      <CompanyProfile company={company} />
    </main>
  )
}
