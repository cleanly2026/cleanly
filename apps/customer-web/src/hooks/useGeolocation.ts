'use client'
import { useState, useEffect } from 'react'

export interface GeolocationState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lng: null, error: 'Geolocation not supported', loading: false })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (_err) => {
        // GPS unavailable — triggers fallback city picker per DISC-02
        setState({ lat: null, lng: null, error: 'GPS unavailable', loading: false })
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  return state
}
