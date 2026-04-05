import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { useEffect } from 'react'
import '../src/i18n/expo-i18n' // Initialize i18n on app start
import { usePushToken } from '../src/hooks/usePushToken'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
  })

  // Register Expo push token on app launch (NOTF-01)
  usePushToken()

  if (!fontsLoaded) {
    // Return null to show splash screen while fonts load
    return null
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}
