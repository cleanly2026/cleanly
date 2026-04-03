import React, { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import MapView, { Marker, AnimatedRegion } from 'react-native-maps'
import { Droplets } from 'lucide-react-native'

type WasherMarkerProps = {
  latitude: number
  longitude: number
  heading?: number
}

export function WasherMarker({ latitude, longitude, heading }: WasherMarkerProps) {
  const animatedRegion = useRef(
    new AnimatedRegion({
      latitude,
      longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current

  useEffect(() => {
    animatedRegion
      .timing({
        latitude,
        longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 800,
        useNativeDriver: false,
      })
      .start()
  }, [latitude, longitude])

  return (
    <Marker.Animated coordinate={animatedRegion} anchor={{ x: 0.5, y: 0.5 }}>
      <View
        style={[
          styles.markerContainer,
          heading !== undefined ? { transform: [{ rotate: `${heading}deg` }] } : undefined,
        ]}
      >
        <Droplets size={16} color="#FFFFFF" />
      </View>
    </Marker.Animated>
  )
}

const styles = StyleSheet.create({
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A2744',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
