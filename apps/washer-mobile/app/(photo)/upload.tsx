import { View, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { PhotoUploader } from '../../src/components/PhotoUploader'
import { useAuth } from '../../src/contexts/AuthContext'

export default function PhotoUploadScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    orderId: string
    photoType: 'before' | 'after' | 'pickup' | 'return'
    serviceType: string
    nextRoute?: string
  }>()

  const { orderId, photoType, serviceType, nextRoute } = params
  const orderType = serviceType === 'carpet' ? 'carpet' : 'on_site'

  // Resolve instruction string via i18n keys
  const instructionKey = (() => {
    if (photoType === 'before') {
      return orderType === 'carpet' ? 'washer.photo.beforeCarpet' : 'washer.photo.beforeOnSite'
    }
    if (photoType === 'after') {
      return orderType === 'carpet' ? 'washer.photo.afterCarpet' : 'washer.photo.afterOnSite'
    }
    if (photoType === 'pickup') return 'washer.photo.beforeCarpet'
    if (photoType === 'return') return 'washer.photo.afterCarpet'
    return 'washer.photo.beforeOnSite'
  })()

  const bodyKey = (() => {
    if (photoType === 'before') return 'washer.photo.bodyBefore'
    if (photoType === 'after') return 'washer.photo.bodyAfter'
    if (photoType === 'pickup') return 'washer.photo.bodyPickup'
    if (photoType === 'return') return 'washer.photo.bodyReturn'
    return 'washer.photo.bodyBefore'
  })()

  const instruction = t(instructionKey)
  const bodyText = t(bodyKey)

  const { token } = useAuth()

  const handleComplete = () => {
    if (nextRoute) {
      router.push(nextRoute as any)
    } else {
      router.back()
    }
  }

  const handleSkip = (_reason: string) => {
    if (nextRoute) {
      router.push(nextRoute as any)
    } else {
      router.back()
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <PhotoUploader
        orderId={orderId}
        photoType={photoType}
        instruction={instruction}
        bodyText={bodyText}
        token={token}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
})
