import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { OnlineToggle } from '../../src/components/OnlineToggle'
import i18n, { switchLanguage } from '../../src/i18n/expo-i18n'
import { useWasherSocket } from '../../src/hooks/useWasherSocket'
import { useAuth } from '../../src/contexts/AuthContext'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
const ONLINE_STATUS_KEY = 'washer_online_status'

type CompletedJob = {
  id: string
  orderNumber: string
  serviceType: string
  amountEarned: number
}

type WasherStats = {
  todayEarnings: number
  jobsCompletedToday: number
  completedJobs: CompletedJob[]
  nextScheduledJob: {
    serviceType: string
    eta: string
    address: string
    lat: number
    lng: number
  } | null
}

// Mock data — endpoint GET /api/washers/me/stats to be wired in Phase 3 API
const MOCK_STATS: WasherStats = {
  todayEarnings: 0,
  jobsCompletedToday: 0,
  completedJobs: [],
  nextScheduledJob: null,
}

export default function WasherHomeScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { token } = useAuth()
  const router = useRouter()

  const [isOnline, setIsOnline] = useState(false)
  const [stats, setStats] = useState<WasherStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore persisted online status
  useEffect(() => {
    AsyncStorage.getItem(ONLINE_STATUS_KEY).then((saved) => {
      if (saved === 'true') setIsOnline(true)
    })
  }, [])

  // Fetch washer stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        if (!token) {
          setStats(MOCK_STATS)
          return
        }
        const res = await fetch(`${API_URL}/api/washers/me/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          setStats(await res.json())
        } else {
          setStats(MOCK_STATS)
        }
      } catch {
        setStats(MOCK_STATS)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [token])

  const handleJobAlert = useCallback((alert: { orderId: string; serviceType: string; companyName: string; customerAddress: string; customerLat: number; customerLng: number; estimatedDistance: number }) => {
    router.push({
      pathname: '/(job)/alert',
      params: {
        orderId: alert.orderId,
        serviceType: alert.serviceType,
        companyName: alert.companyName,
        customerAddress: alert.customerAddress,
        customerLat: String(alert.customerLat),
        customerLng: String(alert.customerLng),
        estimatedDistance: String(alert.estimatedDistance),
      },
    })
  }, [router])

  useWasherSocket(token, handleJobAlert)

  const renderJobRow = ({ item }: { item: CompletedJob }) => (
    <View style={styles.jobRow}>
      <Text style={styles.orderNumber}>{item.orderNumber}</Text>
      <Text style={styles.serviceType}>{item.serviceType}</Text>
      <Text style={styles.amountEarned}>AED {item.amountEarned.toFixed(2)}</Text>
    </View>
  )

  const bottomPad = Math.max(insets.bottom, 16)

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7F4" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Online/Offline Toggle */}
        <View style={styles.section}>
          <OnlineToggle
            isOnline={isOnline}
            onToggle={setIsOnline}
            hasActiveJob={false}
            token={token ?? undefined}
          />
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          {loading ? (
            <View style={styles.earningsSkeleton} />
          ) : (
            <>
              {/* Wrap numeric amounts in LTR container — amounts always LTR in Arabic mode */}
              <View style={{ direction: 'ltr' } as any}>
                <Text style={styles.earningsLabel}>{t('washer.home.earnings')}</Text>
                <Text style={styles.earningsAmount}>
                  AED {(stats?.todayEarnings ?? 0).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.jobsCompletedLabel}>
                {stats?.jobsCompletedToday ?? 0} {t('washer.home.jobsCompleted')}
              </Text>
            </>
          )}
        </View>

        {/* Next Scheduled Job (conditional) */}
        {stats?.nextScheduledJob && (
          <View style={styles.nextJobCard}>
            <Text style={styles.nextJobService}>{stats.nextScheduledJob.serviceType}</Text>
            <Text style={styles.nextJobEta}>{stats.nextScheduledJob.eta}</Text>
            <Text style={styles.nextJobAddress}>{stats.nextScheduledJob.address}</Text>
          </View>
        )}

        {/* Test Buttons */}
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => {
              const next = i18n.language === 'en' ? 'ar' : 'en'
              switchLanguage(next as 'en' | 'ar')
            }}
          >
            <Text style={styles.langToggleText}>
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langToggle, { backgroundColor: '#C9A84C' }]}
            onPress={() => {
              router.push({
                pathname: '/(job)/alert',
                params: {
                  orderId: 'test-order-001',
                  serviceType: 'car_wash',
                  companyName: 'Sparkle Auto Care',
                  customerAddress: 'Downtown Dubai, Sheikh Mohammed Blvd',
                  customerLat: '25.1972',
                  customerLng: '55.2744',
                  estimatedDistance: '3200',
                },
              })
            }}
          >
            <Text style={[styles.langToggleText, { color: '#1A2744' }]}>
              Simulate Job Alert
            </Text>
          </TouchableOpacity>
        </View>

        {/* Completed Jobs List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('washer.home.jobsCompleted')}</Text>

          {loading ? (
            <View style={styles.listSkeleton} />
          ) : stats && stats.completedJobs.length > 0 ? (
            <FlatList
              data={stats.completedJobs}
              keyExtractor={(item) => item.id}
              renderItem={renderJobRow}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              scrollEnabled={false}
            />
          ) : (
            /* Empty state */
            <View style={styles.emptyState}>
              <Text style={styles.emptyHeading}>{t('washer.home.emptyHeading')}</Text>
              <Text style={styles.emptyBody}>{t('washer.home.emptyBody')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F7F4', // brand.surface
  },
  scrollContent: {
    paddingHorizontal: 16, // md spacing
    gap: 16,
    paddingTop: 60, // Extra top padding to avoid Expo dev client gear icon overlay
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
  },

  // Earnings card
  earningsCard: {
    backgroundColor: '#1A2744', // brand.navy
    borderRadius: 12,
    padding: 24,
    gap: 8,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: '600',
    color: '#C9A84C', // brand.gold
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  jobsCompletedLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.7,
    marginStart: 0,
    marginEnd: 0,
  },
  earningsSkeleton: {
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },

  // Next job card
  nextJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E8E5DF',
  },
  nextJobService: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A2744',
  },
  nextJobEta: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
  },
  nextJobAddress: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },

  // Job rows
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    fontFamily: 'monospace',
    flex: 1,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A2744',
    flex: 2,
  },
  amountEarned: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1A2744',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E5DF',
  },
  listSkeleton: {
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },

  // Language toggle
  testButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  langToggle: {
    flex: 1,
    backgroundColor: '#1A2744',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  langToggleText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
})
