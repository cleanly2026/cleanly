'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Check } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface AddOn {
  id: string
  name_en: string
  name_ar: string
  price: number
}

interface Package {
  id: string
  category: 'car_wash' | 'carpet' | 'sofa'
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  base_price: number
  add_ons: AddOn[]
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

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
  packages: Package[]
  reviews: Review[]
}

interface CompanyProfileProps {
  company: CompanyData
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-xs" aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(rating) ? 'fill-brand-gold text-brand-gold' : 'fill-brand-muted text-brand-muted'}
        />
      ))}
    </span>
  )
}

export function CompanyProfile({ company }: CompanyProfileProps) {
  const t = useTranslations('discovery')
  const locale = useLocale()
  const router = useRouter()

  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, Set<string>>>({})

  const name = locale === 'ar' ? company.name_ar : company.name_en
  const description = locale === 'ar' ? company.description_ar : company.description_en
  const initials = name.slice(0, 2).toUpperCase()

  function toggleAddOn(packageId: string, addOnId: string) {
    setSelectedAddOns((prev) => {
      const current = new Set(prev[packageId] ?? [])
      if (current.has(addOnId)) {
        current.delete(addOnId)
      } else {
        current.add(addOnId)
      }
      return { ...prev, [packageId]: current }
    })
  }

  function handleSelectPackage(pkg: Package) {
    const addOnIds = [...(selectedAddOns[pkg.id] ?? [])]
    const query = new URLSearchParams({
      package: pkg.id,
      company: company.slug,
    })
    addOnIds.forEach((id) => query.append('addon', id))

    const route = pkg.category === 'carpet'
      ? `/booking/carpet?${query.toString()}`
      : `/booking/on-site?${query.toString()}`

    router.push(route)
  }

  return (
    <div className="max-w-2xl mx-auto px-md py-xl">
      {/* Section 1: Header */}
      <div className="flex items-start gap-md mb-2xl">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt={name}
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full bg-brand-navy text-white flex items-center justify-center text-heading font-semibold shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-display font-semibold text-brand-navy">{name}</h1>
          <div className="flex items-center gap-sm mt-xs">
            <StarRating rating={company.avg_rating} />
            <span className="text-label text-brand-navy/60">
              {company.avg_rating.toFixed(1)} ({company.review_count})
            </span>
          </div>
          {description && (
            <p className="text-body text-brand-navy/80 mt-sm">{description}</p>
          )}
        </div>
      </div>

      {/* Section 2: Packages */}
      <section aria-labelledby="packages-heading" className="mb-2xl">
        <h2 id="packages-heading" className="text-heading font-semibold text-brand-navy mb-md">
          {t('company_profile_packages')}
        </h2>

        {company.packages.length === 0 ? (
          <p className="text-body text-brand-navy/60">{t('no_reviews')}</p>
        ) : (
          <div className="flex flex-col gap-md">
            {company.packages.map((pkg) => {
              const pkgName = locale === 'ar' ? pkg.name_ar : pkg.name_en
              const pkgDesc = locale === 'ar' ? pkg.description_ar : pkg.description_en
              const priceAed = (pkg.base_price / 100).toFixed(2)

              return (
                <div
                  key={pkg.id}
                  className="bg-white border border-brand-muted rounded-xl p-md"
                >
                  <div className="flex items-start justify-between gap-md mb-sm">
                    <div>
                      <h3 className="text-heading font-semibold text-brand-navy">{pkgName}</h3>
                      <p className="text-body text-brand-navy/70 mt-xs">{pkgDesc}</p>
                    </div>
                    <span className="text-body font-semibold text-brand-navy shrink-0">
                      AED {priceAed}
                    </span>
                  </div>

                  {/* Add-ons for this package */}
                  {pkg.add_ons.length > 0 && (
                    <div className="mb-md">
                      <p className="text-label text-brand-navy/60 mb-sm">
                        {t('company_profile_add_ons')}
                      </p>
                      <div className="flex flex-wrap gap-sm">
                        {pkg.add_ons.map((addOn) => {
                          const isSelected = selectedAddOns[pkg.id]?.has(addOn.id) ?? false
                          const addOnName = locale === 'ar' ? addOn.name_ar : addOn.name_en
                          const addOnPrice = (addOn.price / 100).toFixed(2)

                          return (
                            <button
                              key={addOn.id}
                              type="button"
                              onClick={() => toggleAddOn(pkg.id, addOn.id)}
                              className={[
                                'flex items-center gap-xs px-md min-h-[44px] rounded-full text-label transition-colors',
                                isSelected
                                  ? 'bg-brand-navy text-white'
                                  : 'bg-brand-muted text-brand-navy',
                              ].join(' ')}
                              aria-pressed={isSelected}
                            >
                              {isSelected && <Check size={16} className="shrink-0" />}
                              {addOnName}
                              <span className="ms-xs opacity-80">+ AED {addOnPrice}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className="w-full bg-brand-gold text-white font-semibold py-sm rounded-lg min-h-[44px] hover:opacity-90 transition-opacity"
                  >
                    {t('company_listing_starting_from')} AED {priceAed}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section 3: Reviews */}
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="text-heading font-semibold text-brand-navy mb-md">
          {t('company_profile_reviews')}
        </h2>

        {company.reviews.length === 0 ? (
          <p className="text-body text-brand-navy/60">{t('no_reviews')}</p>
        ) : (
          <div className="flex flex-col gap-md">
            {company.reviews.map((review) => (
              <div key={review.id} className="flex gap-sm">
                {/* Reviewer avatar placeholder */}
                <div
                  className="w-8 h-8 rounded-full bg-brand-muted shrink-0 mt-xs"
                  aria-hidden="true"
                />
                <div>
                  <StarRating rating={review.rating} size={14} />
                  {review.comment && (
                    <p className="text-body text-brand-navy/80 mt-xs">{review.comment}</p>
                  )}
                  <p className="text-label text-brand-navy/40 mt-xs">
                    {new Date(review.created_at).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="mt-md text-body text-brand-navy hover:underline"
        >
          {t('company_profile_see_all_reviews')}
        </button>
      </section>
    </div>
  )
}
