import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Animated,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker, Polyline, MapViewRef } from 'react-native-maps'
import * as Location from 'expo-location'
import { useTranslation } from 'react-i18next'
import { Phone } from 'lucide-react-native'
import { useGpsTracking } from '../../src/hooks/useGpsTracking'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

// TODO: Replace with real auth context
const MOCK_TOKEN: string | null = null

/**
 * Haversine formula: returns distance in meters between two GPS coordinates.
 */
function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function EnRouteScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapViewRef>(null)

  const params = useLocalSearchParams<{
    orderId: string
    serviceType: string
    companyName: string
    customerAddress: string
    customerLat: string
    customerLng: string
    customerName: string
    customerPhone: string
  }>()

  const {
    orderId = '',
    serviceType = '',
    customerAddress = '',
    customerLat = '0',
    customerLng = '0',
    customerName = '',
    customerPhone = '',
  } = params

  const customerLatNum = parseFloat(customerLat)
  const customerLngNum = parseFloat(customerLng)

  // Washer live position (foreground display only)
  const [washerLocation, setWasherLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  // Pulsing animation for washer dot
  const pulseAnim = useRef(new Animated.Value(1)).current

  // GPS tracking hook (handles Socket.io broadcast + background task)
  const { startTracking } = useGpsTracking()

  // ETA calculation
  const distanceMeters = washerLocation
    ? haversineDistanceMeters(
        washerLocation.latitude,
        washerLocation.longitude,
        customerLatNum,
        customerLngNum
      )
    : null

  const etaMinutes = distanceMeters !== null ? Math.round(distanceMeters / 8.33) : null

  // Start GPS background broadcasting + foreground location watch
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null

    const initTracking = async () => {
      try {
        // Start background GPS broadcasting via Socket.io
        if (orderId) {
          await startTracking(orderId)
        }

        // Foreground position watch — for map display only
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            setWasherLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            })
          }
        )
      } catch (err) {
        // Non-fatal: GPS permission may be denied or device may not support background
        console.warn('[EnRoute] GPS tracking init error:', err)
      }
    }

    void initTracking()

    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
      // NOTE: Do NOT stop GPS tracking on unmount — GPS continues during in_progress state
    }
  }, [orderId, startTracking])

  // Auto-fit map to show both washer and customer pins
  useEffect(() => {
    if (!washerLocation || !mapRef.current) return
    mapRef.current.fitToCoordinates(
      [
        { latitude: washerLocation.latitude, longitude: washerLocation.longitude },
        { latitude: customerLatNum, longitude: customerLngNum },
      ],
      { edgePadding: { top: 60, right: 40, bottom: 40, left: 40 }, animated: true }
    )
  }, [washerLocation, customerLatNum, customerLngNum])

  // Pulse animation for washer dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  // Open Google Maps navigation
  const handleNavigate = async () => {
    if (Platform.OS === 'android') {
      await Linking.openURL(
        `google.navigation:q=${customerLatNum},${customerLngNum}&mode=d`
      )
    } else {
      // iOS: try Google Maps app, fall back to web
      const googleMapsUrl = `comgooglemaps://?daddr=${customerLatNum},${customerLngNum}&directionsmode=driving`
      const canOpen = await Linking.canOpenURL(googleMapsUrl)
      if (canOpen) {
        await Linking.openURL(googleMapsUrl)
      } else {
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${customerLatNum},${customerLngNum}&travelmode=driving`
        )
      }
    }
  }

  // Call customer
  const handleCallCustomer = async () => {
    if (customerPhone) {
      await Linking.openURL(`tel:${customerPhone}`)
    }
  }

  // "I've Arrived" — transition order to in_progress
  const handleArrived = async () => {
    try {
      if (MOCK_TOKEN && orderId) {
        await fetch(`${API_URL}/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
          body: JSON.stringify({ status: 'in_progress' }),
        })
      }
    } catch {
      // Non-fatal: proceed to before-photo screen regardless
    }
    // NOTE: GPS tracking is NOT stopped here — continues during in_progress state
    router.replace({
      pathname: '/(job)/before-photo',
      params: { orderId, serviceType },
    })
  }

  const bottomPad = Math.max(insets.bottom, 16)

  return (
    <View style={styles.screen}>
      {/* Map — fills top ~60% */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? 'google' : undefined}
        initialRegion={
          customerLatNum !== 0
            ? {
                latitude: customerLatNum,
                longitude: customerLngNum,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : undefined
        }
      >
        {/* Customer pin — navy fill */}
        {customerLatNum !== 0 && (
          <Marker
            coordinate={{ latitude: customerLatNum, longitude: customerLngNum }}
            pinColor="#1A2744"
            title={customerName || 'Customer'}
          />
        )}

        {/* Washer pin — animated gold dot */}
        {washerLocation && (
          <Marker
            coordinate={washerLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.View
              style={[
                styles.washerDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
          </Marker>
        )}

        {/* Straight-line polyline (no Directions API in Phase 3) */}
        {washerLocation && customerLatNum !== 0 && (
          <Polyline
            coordinates={[
              { latitude: washerLocation.latitude, longitude: washerLocation.longitude },
              { latitude: customerLatNum, longitude: customerLngNum },
            ]}
            strokeColor="#C9A84C"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      {/* Bottom sheet — persistent ~40% */}
      <View style={[styles.bottomSheet, { paddingBottom: bottomPad }]}>
        {/* Customer name + service type */}
        <Text style={styles.customerNameText}>
          {customerName || '—'}
          {serviceType ? `  ·  ${serviceType}` : ''}
        </Text>

        {/* ETA countdown */}
        <Text style={styles.etaText}>
          {etaMinutes === null
            ? '—'
            : etaMinutes < 2
            ? t('tracking.etaImminent')
            : t('tracking.eta', { minutes: etaMinutes })}
        </Text>

        {/* Address */}
        <Text style={styles.addressText} numberOfLines={2}>
          {customerAddress}
        </Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {/* Navigate button */}
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => void handleNavigate()}
            activeOpacity={0.85}
          >
            <Text style={styles.navigateButtonText}>{t('washer.enRoute.navigate')}</Text>
          </TouchableOpacity>

          {/* Call customer icon button */}
          {customerPhone ? (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => void handleCallCustomer()}
              activeOpacity={0.85}
            >
              <Phone size={20} color="#1A2744" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* I've Arrived button */}
        <TouchableOpacity
          style={styles.arrivedButton}
          onPress={() => void handleArrived()}
          activeOpacity={0.85}
        >
          <Text style={styles.arrivedButtonText}>{t('washer.enRoute.arrived')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F7F4', // brand.surface
  },

  // Map takes ~60% of screen height
  map: {
    flex: 1,
  },

  // Pulsing washer dot
  washerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C9A84C', // brand.gold
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },

  // Bottom sheet
  bottomSheet: {
    backgroundColor: '#F8F7F4', // brand.surface
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
    paddingHorizontal: 24, // lg spacing
    paddingTop: 24,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },

  // Customer name + service type
  customerNameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744', // brand.navy
  },

  // ETA
  etaText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#C9A84C', // brand.gold
  },

  // Address
  addressText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A2744', // brand.navy
    lineHeight: 24,
  },

  // Actions row: navigate + call side by side
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  // Navigate button — full-width in row (minus call button)
  navigateButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#C9A84C', // brand.gold
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744', // brand.navy
  },

  // Call customer icon button
  callButton: {
    width: 44,
    height: 44,
    backgroundColor: '#E8E5DF', // brand.muted
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // I've Arrived button
  arrivedButton: {
    height: 44,
    backgroundColor: '#1A2744', // brand.navy
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
