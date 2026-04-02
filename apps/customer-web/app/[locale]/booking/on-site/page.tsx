'use client'
import dynamic from 'next/dynamic'
import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations, useLocale } from 'next-intl'
import { Minus, Plus } from 'lucide-react'
import { AddOnChips } from '@/src/components/AddOnChips'
import { BookingSummary } from '@/src/components/BookingSummary'
import { StickyBottomBar } from '@/src/components/StickyBottomBar'
import { apiFetch } from '@/src/lib/api'

// CRITICAL: LocationPicker uses react-leaflet — must not render on server (Pitfall 2)
const LocationPicker = dynamic(
  () => import('@/src/components/LocationPicker').then((m) => m.LocationPicker),
  { ssr: false }
)

interface AddOn {
  id: string
  name_en: string
  name_ar: string
  price: number
}

interface PackageData {
  id: string
  name_en: string
  name_ar: string
  base_price: number
  add_ons: AddOn[]
}

interface CompanyData {
  id: string
  name_en: string
  name_ar: string
  slug: string
  commission_rate: number
  packages: PackageData[]
}

export default function OnSiteBookingPage() {
  const t = useTranslations('booking')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const packageId = searchParams.get('package') ?? ''
  const companySlug = searchParams.get('company') ?? ''

  // Fetch company data
  const { data: company, isLoading, error } = useQuery<CompanyData>({
    queryKey: ['company', companySlug],
    queryFn: () => apiFetch<CompanyData>(`/companies/${companySlug}`),
    enabled: !!companySlug,
  })

  const pkg = company?.packages.find((p) => p.id === packageId)

  // Local booking state
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState('')
  const [locationNote, setLocationNote] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  function handleLocationChange(lat: number, lng: number, address: string) {
    setLocation({ lat, lng })
    setLocationAddress(address)
  }

  // Running total (client-side estimate)
  const { platformFee, total, selectedAddOnData } = useMemo(() => {
    if (!pkg) return { platformFee: 0, total: 0, selectedAddOnData: [] }

    const baseTotal = pkg.base_price * quantity
    const addOnData = pkg.add_ons.filter((a) => selectedAddOns.includes(a.id))
    const addOnsTotal = addOnData.reduce((sum, a) => sum + a.price, 0)
    const sub = baseTotal + addOnsTotal
    const fee = Math.round(sub * 0.15)
    return {
      platformFee: fee,
      total: sub + fee,
      selectedAddOnData: addOnData,
    }
  }, [pkg, quantity, selectedAddOns])

  const isReady = !!pkg && !!location

  async function handleBookNow() {
    if (!isReady || !company || !location) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await apiFetch<{ order_id: string; client_secret: string }>(
        '/orders/on-site',
        {
          method: 'POST',
          body: {
            package_id: packageId,
            quantity,
            add_on_ids: selectedAddOns,
            service_location: { lat: location.lat, lng: location.lng },
            location_note: locationNote,
          },
        }
      )
      router.push(`/${locale}/payment?order_id=${result.order_id}&client_secret=${encodeURIComponent(result.client_secret)}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('booking_failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const pkgName = pkg
    ? locale === 'ar'
      ? pkg.name_ar
      : pkg.name_en
    : ''

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-md py-xl pb-[88px]">
        <div className="h-8 bg-brand-muted rounded animate-pulse mb-md" />
        <div className="h-32 bg-brand-muted rounded animate-pulse" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto px-md py-xl">
        <p className="text-body text-semantic-destructive">{t('booking_failed')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-md py-xl pb-[88px]">
      {/* Package summary */}
      {pkg && (
        <div className="mb-xl">
          <h1 className="text-display font-semibold text-brand-navy mb-sm">{pkgName}</h1>
          <p className="text-body text-brand-navy/70">
            AED {(pkg.base_price / 100).toFixed(2)}
          </p>
        </div>
      )}

      {/* Quantity stepper */}
      <section className="mb-xl">
        <h2 className="text-heading font-semibold text-brand-navy mb-md">{t('quantity')}</h2>
        <div className="flex items-center gap-md" dir="ltr">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-[44px] h-[44px] rounded-full bg-brand-muted text-brand-navy flex items-center justify-center hover:bg-brand-navy hover:text-white transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={18} />
          </button>
          <span className="text-heading font-semibold text-brand-navy w-8 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-[44px] h-[44px] rounded-full bg-brand-muted text-brand-navy flex items-center justify-center hover:bg-brand-navy hover:text-white transition-colors"
            aria-label="Increase quantity"
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      {/* Add-ons */}
      {pkg && pkg.add_ons.length > 0 && (
        <section className="mb-xl">
          <h2 className="text-heading font-semibold text-brand-navy mb-md">
            {/* discovery.company_profile_add_ons */}
            Add-ons
          </h2>
          <AddOnChips
            addOns={pkg.add_ons}
            selected={selectedAddOns}
            onToggle={toggleAddOn}
            locale={locale}
          />
        </section>
      )}

      {/* Location */}
      <section className="mb-xl">
        <h2 className="text-heading font-semibold text-brand-navy mb-md">{t('location_pin_title')}</h2>
        <LocationPicker
          onLocationChange={handleLocationChange}
          locationNote={locationNote}
          onNoteChange={setLocationNote}
          locale={locale}
        />
      </section>

      {/* Order Summary */}
      {pkg && (
        <section className="mb-xl">
          <BookingSummary
            packageName={pkgName}
            packagePrice={pkg.base_price}
            quantity={quantity}
            addOns={selectedAddOnData.map((a) => ({
              name: locale === 'ar' ? a.name_ar : a.name_en,
              price: a.price,
            }))}
            platformFee={platformFee}
            total={total}
          />
        </section>
      )}

      {/* Submit error */}
      {submitError && (
        <p className="text-body text-semantic-destructive mb-md">{submitError}</p>
      )}

      {/* Sticky bottom bar */}
      <StickyBottomBar
        total={total}
        ctaText={t('book_now')}
        onCtaClick={handleBookNow}
        disabled={!isReady || isSubmitting}
      />
    </div>
  )
}
