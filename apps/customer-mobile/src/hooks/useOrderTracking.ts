import { useState, useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'

type WasherLocation = { lat: number; lng: number; heading?: number }

type TrackingState = {
  washerLocation: WasherLocation | null
  previousLocation: WasherLocation | null
  washerInfo: { name: string; photoUrl: string | null } | null
  orderStatus: string
  connected: boolean
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
}

export function useOrderTracking(orderId: string, token: string): TrackingState {
  const [state, setState] = useState<TrackingState>({
    washerLocation: null,
    previousLocation: null,
    washerInfo: null,
    orderStatus: '',
    connected: false,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
  })

  useEffect(() => {
    const socket = connectSocket(token)

    socket.on('connect', () => {
      socket.emit('join:order', { orderId, token })
      setState(s => ({ ...s, connected: true }))
    })

    socket.on('order:washer_location', (data: WasherLocation) => {
      setState(s => ({
        ...s,
        previousLocation: s.washerLocation,
        washerLocation: data,
      }))
    })

    socket.on(
      'order:status-changed',
      (data: { status: string; washerName?: string; washerPhotoUrl?: string }) => {
        setState(s => ({
          ...s,
          orderStatus: data.status,
          washerInfo: data.washerName
            ? { name: data.washerName, photoUrl: data.washerPhotoUrl || null }
            : s.washerInfo,
        }))
      }
    )

    socket.on('order:photo-uploaded', (data: { photoType: string; photoUrl: string }) => {
      setState(s => {
        if (data.photoType === 'before' || data.photoType === 'pickup') {
          return { ...s, beforePhotoUrl: data.photoUrl }
        }
        if (data.photoType === 'after' || data.photoType === 'return') {
          return { ...s, afterPhotoUrl: data.photoUrl }
        }
        return s
      })
    })

    socket.on('disconnect', () => {
      setState(s => ({ ...s, connected: false }))
    })

    return () => {
      const s = getSocket()
      s.off('connect')
      s.off('order:washer_location')
      s.off('order:status-changed')
      s.off('order:photo-uploaded')
      s.off('disconnect')
      disconnectSocket()
    }
  }, [orderId, token])

  return state
}
