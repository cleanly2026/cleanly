import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { getSocket } from './socket'

export const LOCATION_TASK_NAME = 'cleanly-washer-gps'

// Module-level state (not React state — background task cannot access React)
let currentOrderId: string | null = null

export function setCurrentOrderId(orderId: string | null): void {
  currentOrderId = orderId
}

// Task definition at module scope — required by expo-task-manager
// CRITICAL: This MUST be at module top level, NOT inside a component or hook
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('[GPS Task]', error)
    return
  }
  if (data && currentOrderId) {
    const { locations } = data as { locations: Location.LocationObject[] }
    const location = locations[0]
    if (location) {
      const socket = getSocket()
      if (socket.connected) {
        socket.emit('washer:location', {
          orderId: currentOrderId,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          heading: location.coords.heading,
        })
      }
    }
  }
})
