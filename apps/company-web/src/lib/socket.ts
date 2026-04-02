// Socket.io client for company-web real-time order updates
// Created as prerequisite for plan 02-09 (plan 02-02 dependency)
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  auth: () => ({
    token: localStorage.getItem('accessToken') ?? '',
  }),
})

socket.on('connect', () => {
  console.log('[socket] connected:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('[socket] disconnected:', reason)
})

socket.on('connect_error', (err) => {
  console.warn('[socket] connection error:', err.message)
})
