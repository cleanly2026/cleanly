import { io, Socket } from 'socket.io-client'

// WebSocket connects to the base server URL — NOT /api (HTTP routes namespace).
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

let storedCompanyId: string | null = null

export function connectSocket(token: string, companyId: string) {
  storedCompanyId = companyId
  socket.auth = { token }

  if (socket.connected) {
    // Already connected — just join the room
    socket.emit('join:company', { companyId, token })
    return
  }

  socket.connect()
  // Join room once connected; on reconnect, socket.io re-fires 'connect'
  // so the global connect handler above fires, but we need to rejoin the room
  socket.off('connect.auth') // remove previous if any
  socket.on('connect', () => {
    if (storedCompanyId) {
      socket.emit('join:company', { companyId: storedCompanyId, token })
    }
  })
}

export function disconnectSocket() {
  storedCompanyId = null
  socket.disconnect()
}
