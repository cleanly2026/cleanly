import { Stack } from 'expo-router'
import '../src/i18n/expo-i18n' // Initialize i18n on app start

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}
