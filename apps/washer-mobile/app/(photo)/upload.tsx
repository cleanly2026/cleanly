import { View, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PhotoUploader } from '../../src/components/PhotoUploader'
import { useAuth } from '../../src/contexts/AuthContext'

const INSTRUCTION_MAP: Record<string, Record<string, string>> = {
  before: {
    on_site: 'Take a before photo',
    carpet: 'Photograph carpets for pickup',
  },
  after: {
    on_site: 'Take an after photo',
    carpet: 'Photograph returned carpets',
  },
  pickup: {
    carpet: 'Photograph carpets for pickup',
  },
  return: {
    carpet: 'Photograph returned carpets',
  },
}

const BODY_MAP: Record<string, string> = {
  before: 'Show the service area in full view before cleaning begins.',
  after: 'Show the service area after cleaning is complete.',
  pickup: 'Document the carpets before pickup for the customer record.',
  return: 'Document the carpets upon return to confirm condition.',
}

export default function PhotoUploadScreen() {
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

  const instruction = INSTRUCTION_MAP[photoType]?.[orderType] || 'Take a photo'
  const bodyText = BODY_MAP[photoType] || ''

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
