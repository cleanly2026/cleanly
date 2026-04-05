import { Expo, type ExpoPushMessage } from 'expo-server-sdk'

const expo = new Expo({
  ...(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : {}),
})

export async function sendPushNotification(params: {
  pushToken: string
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  if (!Expo.isExpoPushToken(params.pushToken)) {
    console.warn('[Push] Invalid push token:', params.pushToken)
    return
  }
  const message: ExpoPushMessage = {
    to: params.pushToken,
    title: params.title,
    body: params.body,
    sound: 'default',
    ...(params.data !== undefined ? { data: params.data } : {}),
  }
  const messages: ExpoPushMessage[] = [message]
  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk)
  }
}
