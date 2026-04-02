'use client'
import 'leaflet/dist/leaflet.css'
import { useRef, useState } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useTranslations } from 'next-intl'
import type { Map as LeafletMap, LatLng } from 'leaflet'

interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number, address: string) => void
  initialCenter?: { lat: number; lng: number }
  locationNote: string
  onNoteChange: (note: string) => void
  locale?: string
}

// Default center: Dubai city center
const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 }

function MapEventHandler({
  onLocationChange,
  locale,
}: {
  onLocationChange: (lat: number, lng: number, address: string) => void
  locale: string
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useMapEvents({
    moveend(e) {
      const center: LatLng = (e.target as LeafletMap).getCenter()
      const lat = center.lat
      const lng = center.lng

      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${locale}`,
            { headers: { 'User-Agent': 'Cleanly/1.0' } }
          )
          if (!res.ok) return
          const data = await res.json()
          const address: string = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          onLocationChange(lat, lng, address)
        } catch {
          // Nominatim unavailable — surface raw coords
          onLocationChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
      }, 800)
    },
  })

  return null
}

export function LocationPicker({
  onLocationChange,
  initialCenter,
  locationNote,
  onNoteChange,
  locale = 'en',
}: LocationPickerProps) {
  const t = useTranslations('booking')
  const center = initialCenter ?? DEFAULT_CENTER
  const [address, setAddress] = useState<string>('')

  function handleLocationChange(lat: number, lng: number, addr: string) {
    setAddress(addr)
    onLocationChange(lat, lng, addr)
  }

  return (
    <div className="flex flex-col gap-sm">
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-brand-muted">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={15}
          className="h-[240px] sm:h-[360px] w-full"
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapEventHandler onLocationChange={handleLocationChange} locale={locale} />
        </MapContainer>

        {/* Centered fixed pin overlay */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center -translate-y-1/2">
            <div className="w-6 h-6 rounded-full bg-brand-navy border-2 border-white shadow-lg" />
            <div className="w-0.5 h-4 bg-brand-navy" />
          </div>
        </div>
      </div>

      {/* Reverse-geocoded address */}
      {address && (
        <p className="text-body text-brand-navy/80 px-xs">{address}</p>
      )}

      {/* Parking / access notes */}
      <input
        type="text"
        value={locationNote}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={t('parking_notes_placeholder')}
        className="w-full px-md py-sm border border-brand-muted rounded-lg text-body text-brand-navy bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
      />
    </div>
  )
}
