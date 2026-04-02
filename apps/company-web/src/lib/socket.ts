import { io, Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const socket: Socket = io(API_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
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

export function connectSocket(token: string, companyId: string) {
  socket.auth = { token }
  socket.connect()

  socket.on('connect', () => {
    socket.emit('join:company', { companyId, token })
  })
}

export function disconnectSocket() {
  socket.disconnect()
}
