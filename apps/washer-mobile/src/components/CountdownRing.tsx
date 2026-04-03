import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

type CountdownRingProps = {
  /** Total duration of countdown in seconds (default: 30) */
  duration?: number
  /** Remaining seconds */
  remaining: number
  /** Diameter of the ring in dp (default: 120) */
  size?: number
}

/**
 * SVG circular countdown ring.
 * Arc is always drawn clockwise regardless of RTL layout
 * (per UI-SPEC RTL contract point 6 — directional animations are exempt from mirroring).
 */
export function CountdownRing({ duration = 30, remaining, size = 120 }: CountdownRingProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, remaining / duration))
  const strokeDashoffset = (1 - progress) * circumference

  // Brand.gold when >= 10s, semantic.warning when < 10s
  const arcColor = remaining >= 10 ? '#C9A84C' : '#D97706'

  const cx = size / 2
  const cy = size / 2

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — always clockwise (transform to start from top) */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          // Rotate -90deg so arc starts at 12 o'clock (always clockwise per RTL contract)
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      </Svg>
      {/* Center text: remaining seconds */}
      <View style={styles.centerText}>
        <Text style={styles.seconds}>{Math.ceil(remaining)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    // Mono-style number rendering
    fontVariant: ['tabular-nums'],
  },
})
