'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { CategoryCard } from '@/src/components/CategoryCard'
import { CityPicker } from '@/src/components/CityPicker'
import { useGeolocation } from '@/src/hooks/useGeolocation'
import { apiFetch } from '@/src/lib/api'

type ServiceCategory = 'car_wash' | 'carpet' | 'sofa'
const CATEGORIES: ServiceCategory[] = ['car_wash', 'carpet', 'sofa']

interface City {
  id: string
  name_en: string
  name_ar: string
  country: string
}

export default function HomePage() {
  const t = useTranslations('discovery')
  const locale = useLocale()
  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const [cityPickerOpen, setCityPickerOpen] = useState(false)

  const { lat, lng, error: gpsError, loading: gpsLoading } = useGeolocation()

  // Fetch available cities for city picker
  const { data: citiesData } = useQuery<{ cities: City[] }>({
    queryKey: ['cities'],
    queryFn: () => apiFetch('/cities'),
    staleTime: 10 * 60 * 1000, // 10 min — cities change rarely
  })

  const cities = citiesData?.cities ?? []

  // Auto-open city picker when GPS fails or unavailable
  useEffect(() => {
    if (!gpsLoading && gpsError && cities.length > 0) {
      setCityPickerOpen(true)
    }
  }, [gpsLoading, gpsError, cities.length])

  // When GPS succeeds, find the closest city (simplified: pick first active city as placeholder)
  // In production this would calculate distance using lat/lng vs city coordinates
  useEffect(() => {
    if (lat && lng && cities.length > 0 && !selectedCityId) {
      // Default to first city if no better logic available (coordinates not in City model)
      setSelectedCityId(cities[0]?.id ?? null)
    }
  }, [lat, lng, cities, selectedCityId])

  const selectedCity = cities.find((c) => c.id === selectedCityId)
  const cityName = selectedCity
    ? (locale === 'ar' ? selectedCity.name_ar : selectedCity.name_en)
    : t('city_badge')

  function handleCategorySelect(cat: ServiceCategory) {
    setSelectedCategory(cat)
    if (selectedCityId) {
      router.push(`/companies?city_id=${selectedCityId}&category=${cat}`)
    }
  }

  return (
    <main className="min-h-screen bg-brand-surface px-md py-xl">
      {/* City badge */}
      <div className="mb-xl">
        <button
          type="button"
          onClick={() => setCityPickerOpen(true)}
          className="flex items-center gap-xs text-brand-navy border border-brand-muted rounded-full px-md py-xs min-h-[44px] bg-white hover:border-brand-gold/50 transition-colors"
          aria-label={`Current city: ${cityName}. Tap to change.`}
        >
          <MapPin size={16} className="text-brand-gold shrink-0" />
          <span className="text-body">{cityName}</span>
        </button>
      </div>

      {/* GPS error message */}
      {gpsError && !cityPickerOpen && (
        <p className="text-label text-brand-navy/60 mb-md">
          {t('gps_unavailable')}
        </p>
      )}

      {/* Display heading */}
      <h1 className="text-display font-semibold text-brand-navy mb-xl">
        {t('categories.car_wash')}
      </h1>

      {/* 3 Category cards in responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            selected={selectedCategory === cat}
            onSelect={() => handleCategorySelect(cat)}
          />
        ))}
      </div>

      {/* City picker sheet/modal */}
      <CityPicker
        open={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        onSelect={(cityId) => setSelectedCityId(cityId)}
        cities={cities}
        selectedCityId={selectedCityId}
      />
    </main>
  )
}
