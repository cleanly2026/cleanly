import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socket } from '../lib/socket'

export function useOrderSocket(companyId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Join the company-specific Socket.io room
    socket.emit('join', `company:${companyId}`)

    const handleNewOrder = () => {
      queryClient.invalidateQueries({ queryKey: ['company-orders'] })
    }

    const handleStatusChange = () => {
      queryClient.invalidateQueries({ queryKey: ['company-orders'] })
    }

    socket.on('order:new', handleNewOrder)
    socket.on('order:status-changed', handleStatusChange)

    return () => {
      socket.off('order:new', handleNewOrder)
      socket.off('order:status-changed', handleStatusChange)
      socket.emit('leave', `company:${companyId}`)
    }
  }, [companyId, queryClient])
}
