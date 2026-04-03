import React from 'react'
import { View, Text, Image, StyleSheet, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react-native'

type TrackingBottomSheetProps = {
  washerName: string
  washerPhotoUrl: string | null
  etaMinutes: number | null
  statusLabel: string
  serviceType: string
  packageName: string
}

export function TrackingBottomSheet({
  washerName,
  washerPhotoUrl,
  etaMinutes,
  statusLabel,
  serviceType,
  packageName,
}: TrackingBottomSheetProps) {
  const { t } = useTranslation()

  const etaText =
    etaMinutes !== null && etaMinutes < 2
      ? t('tracking.etaImminent')
      : etaMinutes !== null
        ? t('tracking.eta', { minutes: etaMinutes })
        : null

  const rowDirection: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row-reverse' : 'row'

  return (
    <View style={styles.container}>
      {/* Washer row */}
      <View style={[styles.washerRow, { flexDirection: rowDirection }]}>
        {washerPhotoUrl ? (
          <Image source={{ uri: washerPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <Text style={[styles.washerName, { marginStart: 12 }]} numberOfLines={1}>
          {washerName.split(' ')[0]}
        </Text>
      </View>

      {/* Status label */}
      <Text style={styles.statusLabel}>{statusLabel}</Text>

      {/* ETA chip */}
      {etaText !== null && (
        <View style={[styles.etaChip, { flexDirection: rowDirection }]}>
          <Clock size={14} color="#1A2744" />
          <Text style={[styles.etaText, { marginStart: 6 }]}>{etaText}</Text>
        </View>
      )}

      {/* Service + package label */}
      <Text style={styles.serviceLabel} numberOfLines={1}>
        {serviceType}
        {packageName ? ` · ${packageName}` : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F7F4',
    borderTopStartRadius: 16,
    borderTopEndRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    minHeight: '30%' as unknown as number,
  },
  washerRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#E8E5DF',
  },
  washerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A2744',
    lineHeight: 26,
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A2744',
    lineHeight: 24,
    marginBottom: 12,
  },
  etaChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#C9A84C',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2744',
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E8E5DF',
    lineHeight: 20,
  },
})
