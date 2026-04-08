import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import '../src/i18n/expo-i18n' // Initialize i18n on app start
import { usePushToken } from '../src/hooks/usePushToken'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Cairo font — add @expo-google-fonts/cairo if bundling; using system fallback for now
    // 'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    // 'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    // 'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    // 'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
  })

  // Register Expo push token on app launch (NOTF-01)
  usePushToken()

  // Minimal load gate — fonts resolve instantly when using system fonts
  void fontsLoaded

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}
