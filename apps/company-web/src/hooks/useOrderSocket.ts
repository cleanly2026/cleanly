import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socket } from '../lib/socket'

export function useOrderSocket(companyId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // INT-05 fix: emit 'join:company' (not 'join') with { companyId, token } payload
    // Server handler at socket.on('join:company') joins socket to company:{companyId} room
    const token = localStorage.getItem('accessToken') ?? ''
    socket.emit('join:company', { companyId, token })

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
    }
  }, [companyId, queryClient])
}
