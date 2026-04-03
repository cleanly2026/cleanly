import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation } from 'react-i18next'

const ONLINE_STATUS_KEY = 'washer_online_status'
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

type OnlineToggleProps = {
  isOnline: boolean
  onToggle: (value: boolean) => void
  hasActiveJob?: boolean
  token?: string
}

/**
 * Online/offline pill toggle component (WASH-01, D-10).
 * Persists state to AsyncStorage and calls PATCH /api/washers/status.
 * Shows confirmation bottom sheet when going offline with active job.
 */
export function OnlineToggle({ isOnline, onToggle, hasActiveJob = false, token }: OnlineToggleProps) {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    // If going offline with active job — show confirmation sheet
    if (isOnline && hasActiveJob) {
      setShowConfirm(true)
      return
    }
    await applyToggle(!isOnline)
  }

  const applyToggle = async (newValue: boolean) => {
    setLoading(true)
    try {
      await AsyncStorage.setItem(ONLINE_STATUS_KEY, newValue ? 'true' : 'false')

      // API call: PATCH /api/washers/status
      if (token) {
        await fetch(`${API_URL}/api/washers/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ online: newValue }),
        })
      }

      onToggle(newValue)
    } catch (e) {
      console.warn('[OnlineToggle] Failed to persist status', e)
    } finally {
      setLoading(false)
    }
  }

  const confirmGoOffline = async () => {
    setShowConfirm(false)
    await applyToggle(false)
  }

  return (
    <>
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={[styles.pill, isOnline ? styles.pillOnline : styles.pillOffline]}
          onPress={handleToggle}
          activeOpacity={0.85}
          disabled={loading}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOnline }}
        >
          {loading ? (
            <ActivityIndicator color={isOnline ? '#1A2744' : '#1A2744'} size="small" />
          ) : (
            <Text style={styles.pillLabel}>
              {isOnline ? t('washer.toggle.online') : t('washer.toggle.offline')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.statusLabel}>
          {isOnline ? t('washer.status.waiting') : t('washer.status.offline')}
        </Text>
      </View>

      {/* Confirmation bottom sheet — going offline with active job */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetHeading}>{t('washer.offline.goOfflineHeading')}</Text>
            <Text style={styles.sheetBody}>{t('washer.offline.goOfflineBody')}</Text>

            <TouchableOpacity
              style={styles.destructiveBtn}
              onPress={confirmGoOffline}
              activeOpacity={0.85}
            >
              <Text style={styles.destructiveBtnLabel}>{t('washer.offline.goOffline')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.safeBtn}
              onPress={() => setShowConfirm(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.safeBtnLabel}>{t('washer.offline.stayOnline')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Touch target
  },
  pillOnline: {
    backgroundColor: '#C9A84C', // brand.gold
  },
  pillOffline: {
    backgroundColor: '#E8E5DF', // brand.muted
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744', // brand.navy — works on both gold and muted backgrounds
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280', // gray-500
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  sheetHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
    marginBottom: 4,
  },
  sheetBody: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 8,
  },
  destructiveBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#DC2626', // semantic.error red
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  destructiveBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  safeBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  safeBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2744',
  },
})
