import * as Location from 'expo-location'
import { LOCATION_TASK_NAME, setCurrentOrderId } from '../lib/gps-task'
import { getSocket } from '../lib/socket'

export function useGpsTracking() {
  const startTracking = async (orderId: string) => {
    setCurrentOrderId(orderId)

    const { status: fg } = await Location.requestForegroundPermissionsAsync()
    if (fg !== 'granted') throw new Error('Foreground location permission denied')

    const { status: bg } = await Location.requestBackgroundPermissionsAsync()
    if (bg !== 'granted') throw new Error('Background location permission denied')

    // Join order room first — wait for ack before starting GPS
    const socket = getSocket()
    socket.emit('washer:join-order', { orderId })

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'Cleanly — job in progress',
        notificationBody: 'Location sharing active',
      },
      pausesUpdatesAutomatically: false,
    })
  }

  const stopTracking = async () => {
    setCurrentOrderId(null)
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }

  return { startTracking, stopTracking }
}
