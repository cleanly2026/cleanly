import React, { useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  I18nManager,
  Animated,
  Dimensions,
} from 'react-native'
import MapView, { Marker, MapViewRef } from 'react-native-maps'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOrderTracking } from '../../../src/hooks/useOrderTracking'
import { useEta } from '../../../src/hooks/useEta'
import { WasherMarker } from '../../../src/components/WasherMarker'
import { TrackingBottomSheet } from '../../../src/components/TrackingBottomSheet'
import { InProgressCard } from '../../../src/components/InProgressCard'

const { width } = Dimensions.get('window')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderType = 'on_site' | 'carpet'
type CarphaseType = 'pickup' | 'return'

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function TrackingSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  })

  function ShimmerLine({ w, h }: { w: number | string; h: number }) {
    return (
      <View style={{ width: w as number, height: h, backgroundColor: '#E8E5DF', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '100%',
            transform: [{ translateX }],
            backgroundColor: 'rgba(255,255,255,0.6)',
          }}
        />
      </View>
    )
  }

  return (
    <View style={styles.skeletonSheet}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8E5DF', overflow: 'hidden' }}>
          <Animated.View
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '100%',
              transform: [{ translateX }],
              backgroundColor: 'rgba(255,255,255,0.6)',
            }}
          />
        </View>
        <View style={{ marginStart: 12 }}>
          <ShimmerLine w={120} h={18} />
          <ShimmerLine w={80} h={14} />
        </View>
      </View>
      <ShimmerLine w="60%" h={14} />
      <ShimmerLine w="40%" h={14} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Status badge color
// ---------------------------------------------------------------------------

function statusBadgeColor(status: string): string {
  if (status === 'in_progress') return '#16A34A'
  if (status === 'completed') return '#16A34A'
  return '#C9A84C'
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TrackingScreen() {
  const { orderId, token, customerLat, customerLng, serviceType, orderType, carpetPhase, packageName } =
    useLocalSearchParams<{
      orderId: string
      token: string
      customerLat: string
      customerLng: string
      serviceType: string
      orderType: OrderType
      carpetPhase?: CarphaseType
      packageName?: string
    }>()

  const { t, i18n } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapViewRef>(null)
  const hasAutoFitted = useRef(false)

  const custLat = parseFloat(customerLat ?? '0')
  const custLng = parseFloat(customerLng ?? '0')

  const { washerLocation, washerInfo, orderStatus, connected, beforePhotoUrl, afterPhotoUrl } = useOrderTracking(
    orderId ?? '',
    token ?? ''
  )

  const { etaMinutes } = useEta(
    washerLocation?.lat ?? null,
    washerLocation?.lng ?? null,
    custLat,
    custLng
  )

  // Auto-fit map when first location arrives
  useEffect(() => {
    if (washerLocation && !hasAutoFitted.current && mapRef.current) {
      hasAutoFitted.current = true
      mapRef.current.fitToCoordinates(
        [
          { latitude: washerLocation.lat, longitude: washerLocation.lng },
          { latitude: custLat, longitude: custLng },
        ],
        { edgePadding: { top: 100, right: 50, bottom: 300, left: 50 }, animated: true }
      )
    }
  }, [washerLocation, custLat, custLng])

  // Determine status label
  const getStatusLabel = useCallback((): string => {
    if (orderType === 'carpet') {
      if (carpetPhase === 'return') return t('tracking.delivering')
      return t('tracking.pickingUp')
    }
    return t('tracking.onTheWay')
  }, [orderType, carpetPhase, t])

  // Order status label for badge
  const orderStatusLabel = orderStatus
    ? t(`order.status.${orderStatus}`, { defaultValue: orderStatus })
    : ''

  // Loading — not connected yet or no location
  const isLoading = !connected || (washerLocation === null && orderStatus !== 'completed')

  // Tracking state
  const isTracking =
    orderStatus === 'washer_en_route' ||
    orderStatus === 'pickup_scheduled' ||
    orderStatus === 'out_for_return'

  // In progress state
  const isInProgress = orderStatus === 'in_progress'

  // Completed state
  const isCompleted = orderStatus === 'completed'

  // -------------------------------------------------------------------------
  // Render: Floating top bar (shared across states)
  // -------------------------------------------------------------------------

  const FloatingTopBar = () => (
    <View
      style={[
        styles.topBar,
        {
          paddingTop: insets.top + 8,
          flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityLabel={t('common.back')}
      >
        <ChevronLeft size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Order number — always LTR */}
      <View style={{ direction: 'ltr' } as never}>
        <Text style={styles.orderNumber} numberOfLines={1}>
          {orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : ''}
        </Text>
      </View>

      {/* Status badge */}
      {orderStatus ? (
        <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor(orderStatus) }]}>
          <Text style={styles.statusBadgeText} numberOfLines={1}>
            {orderStatusLabel}
          </Text>
        </View>
      ) : null}
    </View>
  )

  // -------------------------------------------------------------------------
  // Render: Completed screen
  // -------------------------------------------------------------------------

  if (isCompleted) {
    const completionKey =
      serviceType === 'car_wash'
        ? 'tracking.completeCar'
        : serviceType === 'sofa'
          ? 'tracking.completeSofa'
          : 'tracking.completeCarpet'

    return (
      <View style={styles.completedScreen}>
        <FloatingTopBar />
        <View style={styles.completedContent}>
          <Text style={styles.completedHeading}>{t(completionKey)}</Text>

          {/* Before / after photos */}
          {(beforePhotoUrl || afterPhotoUrl) && (
            <View style={styles.photosRow}>
              {beforePhotoUrl && (
                <View style={styles.photoCell}>
                  <Image source={{ uri: beforePhotoUrl }} style={styles.photoThumbnail} />
                  <Text style={styles.photoLabel}>Before</Text>
                </View>
              )}
              {afterPhotoUrl && (
                <View style={styles.photoCell}>
                  <Image source={{ uri: afterPhotoUrl }} style={styles.photoThumbnail} />
                  <Text style={styles.photoLabel}>After</Text>
                </View>
              )}
            </View>
          )}

          {/* Rate service — disabled, out of Phase 3 scope */}
          <Text style={[styles.rateLink, { opacity: 0.5 }]}>{t('tracking.rateService')}</Text>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.replace('/')}
            accessibilityLabel={t('tracking.backToHome')}
          >
            <Text style={styles.backHomeText}>{t('tracking.backToHome')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Render: In-progress (map replaced by card)
  // -------------------------------------------------------------------------

  if (isInProgress) {
    return (
      <View style={styles.flex}>
        <FloatingTopBar />
        <InProgressCard
          washerName={washerInfo?.name ?? ''}
          washerPhotoUrl={washerInfo?.photoUrl ?? null}
          serviceType={serviceType ?? ''}
          startTime={Date.now()}
        />
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Loading skeleton
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <FloatingTopBar />
        <View style={styles.mapPlaceholder} />
        <TrackingSkeleton />
      </View>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Live tracking map
  // -------------------------------------------------------------------------

  return (
    <View style={styles.flex}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider="google"
        mapLanguage={i18n.language === 'ar' ? 'ar' : 'en'}
        showsUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={{
          latitude: custLat,
          longitude: custLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Washer animated marker */}
        {washerLocation && (
          <WasherMarker
            latitude={washerLocation.lat}
            longitude={washerLocation.lng}
            heading={washerLocation.heading}
          />
        )}

        {/* Customer gold pin */}
        <Marker coordinate={{ latitude: custLat, longitude: custLng }}>
          <View style={styles.customerPin} />
        </Marker>
      </MapView>

      {/* Floating top bar (overlaid on map) */}
      <FloatingTopBar />

      {/* Bottom sheet */}
      <View style={[styles.bottomSheetWrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TrackingBottomSheet
          washerName={washerInfo?.name ?? ''}
          washerPhotoUrl={washerInfo?.photoUrl ?? null}
          etaMinutes={etaMinutes ?? null}
          statusLabel={getStatusLabel()}
          serviceType={serviceType ?? ''}
          packageName={packageName ?? ''}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8E5DF',
  },
  // Floating top bar
  topBar: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    zIndex: 10,
    backgroundColor: 'rgba(26, 39, 68, 0.9)',
    borderBottomStartRadius: 12,
    borderBottomEndRadius: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
    minHeight: 56,
  },
  backButton: {
    marginEnd: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginStart: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Bottom sheet wrapper
  bottomSheetWrapper: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    zIndex: 10,
  },
  // Customer gold pin
  customerPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C9A84C',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  // Skeleton
  skeletonSheet: {
    backgroundColor: '#F8F7F4',
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  // Completed screen
  completedScreen: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
  completedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  completedHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 24,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  photoCell: {
    flex: 1,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E8E5DF',
    marginTop: 4,
  },
  rateLink: {
    fontSize: 16,
    fontWeight: '400',
    color: '#C9A84C',
    marginBottom: 24,
  },
  backHomeButton: {
    backgroundColor: '#1A2744',
    borderRadius: 8,
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backHomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
