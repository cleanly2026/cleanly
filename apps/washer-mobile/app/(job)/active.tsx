import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChecklistItem } from '../../src/components/ChecklistItem'

const CHECKLISTS: Record<string, string[]> = {
  car_wash: [
    'Exterior wash',
    'Interior vacuum',
    'Window clean',
    'Tire clean',
    'Dashboard wipe',
    'Final inspection',
  ],
  sofa: [
    'Pre-treatment applied',
    'Surface clean',
    'Cushion clean',
    'Final dry check',
    'Odor treatment (if requested)',
    'Final inspection',
  ],
}

export default function ActiveJobScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    orderId: string
    serviceType: string
    startedAt?: string
  }>()

  const { orderId, serviceType, startedAt } = params
  const items = CHECKLISTS[serviceType] || CHECKLISTS.car_wash
  const [checked, setChecked] = useState<boolean[]>(new Array(items.length).fill(false))
  const [elapsed, setElapsed] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const startTimeRef = useRef(startedAt ? new Date(startedAt).getTime() : Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const checkedCount = checked.filter(Boolean).length
  const totalCount = items.length
  const threshold = Math.ceil(totalCount * 0.8)
  const canComplete = checkedCount >= threshold
  const remaining = threshold - checkedCount

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleToggle = (index: number) => {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
    setShowWarning(false)
  }

  const handleComplete = () => {
    if (!canComplete) {
      setShowWarning(true)
      return
    }
    // Navigate to after photo, then completion
    router.push({
      pathname: '/(photo)/upload',
      params: {
        orderId,
        photoType: 'after',
        serviceType,
        nextRoute: `/(job)/complete?orderId=${orderId}&serviceType=${serviceType}&checkedItems=${checked.map((c, i) => (c ? items[i] : '')).filter(Boolean).join('|')}`,
      },
    })
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          <Text style={styles.elapsedTime}>{formatElapsed(elapsed)}</Text>
          <Text style={styles.serviceLabel}>{serviceType.replace('_', ' ')}</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Job Active</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
      >
        {/* Checklist heading */}
        <Text style={styles.heading}>Service Checklist</Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(checkedCount / totalCount) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{`${checkedCount} of ${totalCount} items checked`}</Text>
        </View>

        {/* Checklist items */}
        {items.map((item, index) => (
          <ChecklistItem
            key={item}
            label={item}
            checked={checked[index]}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </ScrollView>

      {/* Complete Job button — sticky bottom */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {showWarning && (
          <Text style={styles.warningText}>
            {`Please complete at least ${remaining} more checklist item(s) before finishing.`}
          </Text>
        )}
        <Pressable
          style={[styles.completeButton, !canComplete && styles.completeButtonDisabled]}
          onPress={handleComplete}
        >
          <Text style={[styles.completeButtonText, !canComplete && styles.completeButtonTextDisabled]}>
            Complete Job
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F4',
  },
  statusBar: {
    backgroundColor: '#1A2744',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  elapsedTime: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#FFFFFF',
  },
  serviceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Cairo',
    textTransform: 'capitalize',
  },
  activeBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Cairo',
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#1A2744',
    fontFamily: 'Cairo',
    marginBottom: 16,
  },
  progressContainer: {
    gap: 8,
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E8E5DF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#C9A84C',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 14,
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: '#F8F7F4',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E5DF',
  },
  warningText: {
    fontSize: 14,
    color: '#D97706',
    fontFamily: 'Cairo',
    marginBottom: 8,
    textAlign: 'center',
  },
  completeButton: {
    height: 56,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#E8E5DF',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744',
    fontFamily: 'Cairo',
  },
  completeButtonTextDisabled: {
    color: '#9CA3AF',
  },
})
