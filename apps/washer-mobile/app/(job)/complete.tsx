import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useGpsTracking } from '../../src/hooks/useGpsTracking'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

type Step = 'summary' | 'confirm' | 'done'

export default function CompleteJobScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { stopTracking } = useGpsTracking()
  const params = useLocalSearchParams<{
    orderId: string
    serviceType: string
    checkedItems?: string
  }>()

  const { orderId, serviceType, checkedItems } = params
  const completedItems = checkedItems ? checkedItems.split('|').filter(Boolean) : []

  const [step, setStep] = useState<Step>('summary')
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TODO: get token from auth context
  const token = ''

  const handleConfirmComplete = async () => {
    setCompleting(true)
    setError(null)
    try {
      // Stop GPS tracking
      await stopTracking()

      // Transition order to completed
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (!res.ok) {
        throw new Error(`Failed to complete order: ${res.status}`)
      }

      setStep('done')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to complete job'
      setError(message)
    } finally {
      setCompleting(false)
    }
  }

  const handleBackToHome = () => {
    router.replace('/(home)')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Step: Summary */}
      {step === 'summary' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.heading}>Job Summary</Text>
          <Text style={styles.serviceType}>{serviceType.replace('_', ' ')}</Text>

          {completedItems.map((item) => (
            <View key={item} style={styles.summaryRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.summaryItem}>{item}</Text>
            </View>
          ))}

          <Pressable style={styles.primaryButton} onPress={() => setStep('confirm')}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <View style={styles.centered}>
          <Text style={styles.heading}>Mark Job Complete?</Text>
          <Text style={styles.serviceType}>{serviceType.replace('_', ' ')}</Text>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>{`Order #CLN-${orderId.slice(0, 8)}`}</Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.primaryButton, completing && styles.buttonDisabled]}
            onPress={handleConfirmComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#1A2744" />
            ) : (
              <Text style={styles.primaryButtonText}>Complete Job</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setStep('summary')} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <View style={styles.centered}>
          <Text style={styles.doneHeading}>Job Done</Text>
          <Text style={styles.doneSubtext}>Service completed successfully</Text>

          <Pressable onPress={handleBackToHome} style={styles.homeLink}>
            <Text style={styles.homeLinkText}>Back to Home</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#1A2744',
    fontFamily: 'Cairo',
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 16,
    color: '#1A2744',
    fontFamily: 'Cairo',
    textTransform: 'capitalize',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkIcon: {
    fontSize: 16,
    color: '#16A34A',
    fontWeight: '600',
  },
  summaryItem: {
    fontSize: 16,
    color: '#1A2744',
    fontFamily: 'Cairo',
    flex: 1,
  },
  primaryButton: {
    height: 56,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  backLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  orderNumberContainer: {
    flexDirection: 'row',
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1A2744',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  doneHeading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#C9A84C',
    fontFamily: 'Cairo',
  },
  doneSubtext: {
    fontSize: 16,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  homeLink: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 24,
  },
  homeLinkText: {
    fontSize: 16,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
})
