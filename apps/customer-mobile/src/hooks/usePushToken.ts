import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * usePushToken — registers the Expo push token with the API on mount.
 * Call this once in the authenticated root layout (app/_layout.tsx).
 * Requests permission if not already granted, then POATCHes the token
 * to /api/users/push-token with the stored auth token.
 * NOTF-01
 */
export function usePushToken() {
  useEffect(() => {
    async function registerPushToken() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }
        if (finalStatus !== 'granted') {
          console.log('[PushToken] Permission not granted -- skipping token registration')
          return
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        })
        const token = tokenData.data

        // Send to API using stored auth token
        const authToken = await AsyncStorage.getItem('accessToken')
        if (!authToken) {
          console.log('[PushToken] No auth token -- skipping registration until user is signed in')
          return
        }

        await fetch(`${API_URL}/api/users/push-token`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token }),
        })
      } catch (err) {
        console.warn('[PushToken] Registration failed:', err)
      }
    }
    void registerPushToken()
  }, [])
}
