import { useMemo } from 'react'

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type EtaResult = {
  etaMinutes: number | null
  distanceMeters: number | null
}

export function useEta(
  washerLat: number | null,
  washerLng: number | null,
  customerLat: number,
  customerLng: number
): EtaResult {
  return useMemo(() => {
    if (washerLat === null || washerLng === null) {
      return { etaMinutes: null, distanceMeters: null }
    }

    const distanceMeters = haversineDistance(
      washerLat,
      washerLng,
      customerLat,
      customerLng
    )
    // 30km/h = 8.33 m/s
    const etaMinutes = Math.round(distanceMeters / 8.33)

    return { etaMinutes, distanceMeters }
  }, [washerLat, washerLng, customerLat, customerLng])
}
