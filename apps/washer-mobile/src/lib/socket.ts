import { io, Socket } from 'socket.io-client'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
    })
  }
  return socket
}

export function connectSocket(token: string): Socket {
  const s = getSocket()
  s.auth = { token }
  s.connect()
  return s
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}
