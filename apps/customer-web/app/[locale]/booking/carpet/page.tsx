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
import { TimeSlotPicker } from '@/src/components/TimeSlotPicker'
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
  carpet_lead_time_days: number
  packages: PackageData[]
}

/**
 * Converts a slot label (e.g. "9-11") and a date string (YYYY-MM-DD)
 * into an ISO 8601 datetime string at the slot's start hour.
 */
function buildPickupTime(dateStr: string, slot: string): string {
  const [startHourStr] = slot.split('-')
  const startHour = parseInt(startHourStr ?? '9', 10)
  // Parse YYYY-MM-DD as local date components to avoid UTC offset issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, startHour, 0, 0, 0)
  return d.toISOString()
}

/**
 * Format a Date as "dd MMM yyyy" (e.g., "08 Apr 2026").
 */
function formatReturnDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(d.getDate()).padStart(2, '0')
  const month = months[d.getMonth()] ?? ''
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

export default function CarpetBookingPage() {
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
  const [locationNote, setLocationNote] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] ?? ''
  )
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  function handleLocationChange(lat: number, lng: number, _address: string) {
    setLocation({ lat, lng })
  }

  // Estimated return date
  const estimatedReturnDate = useMemo(() => {
    if (!selectedDate || !company) return undefined
    const leadDays = company.carpet_lead_time_days ?? 3
    const [year, month, day] = selectedDate.split('-').map(Number)
    const d = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
    d.setDate(d.getDate() + leadDays)
    return formatReturnDate(d)
  }, [selectedDate, company])

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

  const isReady = !!pkg && !!location && !!selectedSlot && !!selectedDate

  async function handleBookNow() {
    if (!isReady || !company || !location || !selectedSlot) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const pickupTime = buildPickupTime(selectedDate, selectedSlot)
      const result = await apiFetch<{ order_id: string; client_secret: string }>(
        '/orders/carpet',
        {
          method: 'POST',
          body: {
            package_id: packageId,
            quantity,
            add_on_ids: selectedAddOns,
            pickup_time: pickupTime,
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

      {/* Carpet count stepper */}
      <section className="mb-xl">
        <h2 className="text-heading font-semibold text-brand-navy mb-md">{t('carpet_count')}</h2>
        <div className="flex items-center gap-md" dir="ltr">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-[44px] h-[44px] rounded-full bg-brand-muted text-brand-navy flex items-center justify-center hover:bg-brand-navy hover:text-white transition-colors"
            aria-label="Decrease carpet count"
          >
            <Minus size={18} />
          </button>
          <span className="text-heading font-semibold text-brand-navy w-8 text-center" dir="ltr">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-[44px] h-[44px] rounded-full bg-brand-muted text-brand-navy flex items-center justify-center hover:bg-brand-navy hover:text-white transition-colors"
            aria-label="Increase carpet count"
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      {/* Add-ons */}
      {pkg && pkg.add_ons.length > 0 && (
        <section className="mb-xl">
          <h2 className="text-heading font-semibold text-brand-navy mb-md">Add-ons</h2>
          <AddOnChips
            addOns={pkg.add_ons}
            selected={selectedAddOns}
            onToggle={toggleAddOn}
            locale={locale}
          />
        </section>
      )}

      {/* Time slot picker */}
      <section className="mb-xl">
        <TimeSlotPicker
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onDateChange={setSelectedDate}
          onSlotChange={setSelectedSlot}
          estimatedReturnDate={estimatedReturnDate}
        />
      </section>

      {/* Pickup location */}
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
