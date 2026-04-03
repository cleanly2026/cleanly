import { useEffect, useCallback } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'

type JobAlert = {
  orderId: string
  serviceType: string
  companyName: string
  customerAddress: string
  customerLat: number
  customerLng: number
  estimatedDistance: number
}

export function useWasherSocket(token: string | null, onJobAlert: (alert: JobAlert) => void) {
  useEffect(() => {
    if (!token) return
    const socket = connectSocket(token)

    socket.on('job:alert', (data: JobAlert) => {
      onJobAlert(data)
    })

    return () => {
      socket.off('job:alert')
      disconnectSocket()
    }
  }, [token, onJobAlert])

  const acceptJob = useCallback((orderId: string) => {
    getSocket().emit('job:accept', { orderId })
  }, [])

  const declineJob = useCallback((orderId: string) => {
    getSocket().emit('job:decline', { orderId })
  }, [])

  return { acceptJob, declineJob }
}
