import '../src/lib/gps-task' // MUST be first — registers background GPS task at module scope
import { Stack } from 'expo-router'
import '../src/i18n/expo-i18n' // Initialize i18n on app start
import { useFonts } from 'expo-font'
import { View, ActivityIndicator } from 'react-native'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Cairo font — add @expo-google-fonts/cairo if bundling; using system fallback for now
    // 'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
  })

  // Minimal load gate — fonts resolve instantly when using system fonts
  // When Cairo is bundled, uncomment above and guard on !fontsLoaded
  void fontsLoaded

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}
