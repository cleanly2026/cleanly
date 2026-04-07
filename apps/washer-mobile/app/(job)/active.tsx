import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ChecklistItem } from '../../src/components/ChecklistItem'

// Checklist item translation keys per service type
const CHECKLIST_KEYS: Record<string, string[]> = {
  car_wash: [
    'washer.checklist.items.car_wash.exterior_wash',
    'washer.checklist.items.car_wash.interior_vacuum',
    'washer.checklist.items.car_wash.window_clean',
    'washer.checklist.items.car_wash.tire_clean',
    'washer.checklist.items.car_wash.dashboard_wipe',
    'washer.checklist.items.car_wash.final_inspection',
  ],
  sofa: [
    'washer.checklist.items.sofa.pre_treatment',
    'washer.checklist.items.sofa.surface_clean',
    'washer.checklist.items.sofa.cushion_clean',
    'washer.checklist.items.sofa.final_dry_check',
    'washer.checklist.items.sofa.odor_treatment',
    'washer.checklist.items.sofa.final_inspection',
  ],
}

export default function ActiveJobScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    orderId: string
    serviceType: string
    startedAt?: string
  }>()

  const { orderId, serviceType, startedAt } = params
  const itemKeys = CHECKLIST_KEYS[serviceType] || CHECKLIST_KEYS.car_wash
  const items = itemKeys.map((key) => t(key))
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

  // Translated service label: try discovery.categories key, fall back to capitalised raw value
  const serviceLabel = t(`discovery.categories.${serviceType}`, {
    defaultValue: (serviceType || 'Service').replace('_', ' '),
  })

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          <Text style={styles.elapsedTime}>{formatElapsed(elapsed)}</Text>
          <Text style={styles.serviceLabel}>{serviceLabel}</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{t('washer.checklist.jobActive')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
      >
        {/* Checklist heading */}
        <Text style={styles.heading}>{t('washer.checklist.heading')}</Text>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(checkedCount / totalCount) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {t('washer.checklist.progress', { checked: checkedCount, total: totalCount })}
          </Text>
        </View>

        {/* Checklist items */}
        {items.map((item, index) => (
          <ChecklistItem
            key={itemKeys[index]}
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
            {t('washer.checklist.incompleteWarning', { count: remaining })}
          </Text>
        )}
        <Pressable
          style={[styles.completeButton, !canComplete && styles.completeButtonDisabled]}
          onPress={handleComplete}
        >
          <Text style={[styles.completeButtonText, !canComplete && styles.completeButtonTextDisabled]}>
            {t('washer.checklist.completeJob')}
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
