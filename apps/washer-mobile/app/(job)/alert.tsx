import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { Car, Sofa, Layers } from 'lucide-react-native'
import { CountdownRing } from '../../src/components/CountdownRing'
import { useWasherSocket } from '../../src/hooks/useWasherSocket'
import { useAuth } from '../../src/contexts/AuthContext'

const COUNTDOWN_DURATION = 30
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

function ServiceIcon({ serviceType, size }: { serviceType: string; size: number }) {
  const color = '#FFFFFF'
  switch (serviceType?.toLowerCase()) {
    case 'car_wash':
      return <Car size={size} color={color} />
    case 'sofa':
      return <Sofa size={size} color={color} />
    default:
      return <Layers size={size} color={color} />
  }
}

export default function JobAlertScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { token } = useAuth()
  const params = useLocalSearchParams<{
    orderId: string
    serviceType: string
    companyName: string
    customerAddress: string
    customerLat: string
    customerLng: string
    estimatedDistance: string
  }>()

  const {
    orderId = '',
    serviceType = '',
    companyName = '',
    customerAddress = '',
    customerLat = '0',
    customerLng = '0',
    estimatedDistance = '0',
  } = params

  const customerLatNum = parseFloat(customerLat)
  const customerLngNum = parseFloat(customerLng)
  const estimatedDistanceNum = parseFloat(estimatedDistance)

  const [remaining, setRemaining] = useState(COUNTDOWN_DURATION)
  const autoDeclinedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const onJobAlert = React.useCallback(() => {
    // Already on the alert screen — no-op
  }, [])

  const { acceptJob, declineJob } = useWasherSocket(token, onJobAlert)

  // Set washer offline via API
  const setWasherOffline = async () => {
    try {
      if (!token) return
      await fetch(`${API_URL}/api/washers/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ online: false }),
      })
    } catch {
      // Silently fail — washer status will reconcile on next app open
    }
  }

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0 && !autoDeclinedRef.current) {
          autoDeclinedRef.current = true
          return 0
        }
        return next
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Auto-decline on expiry
  useEffect(() => {
    if (remaining === 0 && autoDeclinedRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // Auto-decline: emit decline, set offline, navigate home
      if (orderId) {
        declineJob(orderId)
      }
      void setWasherOffline()
      // Navigate back to home
      router.replace('/(home)')
    }
  }, [remaining, orderId, declineJob, router])

  const handleAccept = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    acceptJob(orderId)
    router.replace({
      pathname: '/(job)/en-route',
      params: {
        orderId,
        serviceType,
        companyName,
        customerAddress,
        customerLat,
        customerLng,
        // customerName and customerPhone would come from a real job alert payload
        customerName: companyName,
        customerPhone: '',
      },
    })
  }

  const handleDecline = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (orderId) {
      declineJob(orderId)
    }
    router.replace('/(home)')
  }

  const bottomPad = Math.max(insets.bottom, 16)

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerLabel}>{t('washer.jobAlert.newJob')}</Text>
      </View>

      {/* Content: centered vertically */}
      <View style={styles.content}>
        {/* Countdown ring */}
        <View style={styles.ringContainer}>
          <CountdownRing
            duration={COUNTDOWN_DURATION}
            remaining={remaining}
            size={120}
          />
        </View>

        {/* Service details */}
        <View style={styles.detailsBlock}>
          <View style={styles.serviceRow}>
            <ServiceIcon serviceType={serviceType} size={32} />
            <Text style={styles.serviceName}>{serviceType || 'Service'}</Text>
          </View>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.customerAddress}>{customerAddress}</Text>
          {estimatedDistanceNum > 0 && (
            <Text style={styles.distanceLabel}>
              {(estimatedDistanceNum / 1000).toFixed(1)} km away
            </Text>
          )}
        </View>

        {/* Map preview */}
        {customerLatNum !== 0 && customerLngNum !== 0 ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? 'google' : undefined}
              initialRegion={{
                latitude: customerLatNum,
                longitude: customerLngNum,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              pointerEvents="none"
            >
              <Marker
                coordinate={{ latitude: customerLatNum, longitude: customerLngNum }}
                pinColor="#1A2744"
              />
            </MapView>
            {/* Navy overlay at 30% opacity */}
            <View style={styles.mapOverlay} pointerEvents="none" />
          </View>
        ) : (
          <View style={[styles.mapContainer, styles.mapPlaceholder]}>
            <Text style={styles.mapPlaceholderText}>Loading map…</Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={[styles.buttonContainer, { paddingBottom: bottomPad }]}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => void handleAccept()}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptButtonText}>{t('washer.jobAlert.accept')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => void handleDecline()}
          activeOpacity={0.85}
        >
          <Text style={styles.declineButtonText}>{t('washer.jobAlert.decline')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1A2744', // brand.navy
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Centered content area
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 24,
  },

  // Countdown ring
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Service details
  detailsBlock: {
    alignItems: 'center',
    gap: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  customerAddress: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginStart: 8,
    marginEnd: 8,
  },
  distanceLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },

  // Map preview
  mapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 180,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 39, 68, 0.3)',
  },
  mapPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  acceptButton: {
    height: 56,
    backgroundColor: '#C9A84C', // brand.gold
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744', // brand.navy
  },
  declineButton: {
    height: 44,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DC2626', // semantic.destructive
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#DC2626', // semantic.destructive
  },
})
