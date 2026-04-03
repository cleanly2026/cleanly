import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle } from 'react-native-svg'

type InProgressCardProps = {
  washerName: string
  washerPhotoUrl: string | null
  serviceType: string
  startTime: number // epoch ms
}

const RING_SIZE = 120
const STROKE_WIDTH = 8
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function InProgressCard({
  washerName,
  washerPhotoUrl,
  serviceType,
  startTime,
}: InProgressCardProps) {
  const { t } = useTranslation()
  const animValue = useRef(new Animated.Value(0)).current
  const [elapsedMinutes, setElapsedMinutes] = useState(
    Math.floor((Date.now() - startTime) / 60000)
  )

  // Indeterminate looping ring animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // Update elapsed time every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - startTime) / 60000))
    }, 30000)
    return () => clearInterval(interval)
  }, [startTime])

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  })

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {/* Washer avatar + name */}
        {washerPhotoUrl ? (
          <Image source={{ uri: washerPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <Text style={styles.washerName}>{washerName}</Text>
        <Text style={styles.serviceType}>{serviceType}</Text>

        {/* Progress ring */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Animated arc */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke="#C9A84C"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
        </View>

        {/* Elapsed time */}
        <Text style={styles.elapsedLabel}>
          {t('tracking.inProgress', { minutes: elapsedMinutes })}
        </Text>
      </View>

      {/* Reassurance text */}
      <Text style={styles.reassurance}>{t('tracking.reassurance')}</Text>
    </View>
  )
}

// Animated circle wrapper for react-native-svg
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A2744',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  washerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  ringContainer: {
    marginBottom: 16,
  },
  elapsedLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#C9A84C',
    lineHeight: 20,
    textAlign: 'center',
  },
  reassurance: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E8E5DF',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 24,
  },
})
