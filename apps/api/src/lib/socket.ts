import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'

let io: SocketServer

export function setupSocketHandlers(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: [
        process.env.CUSTOMER_WEB_URL || 'http://localhost:3001',
        process.env.COMPANY_WEB_URL || 'http://localhost:3002',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    // Company room join — validate JWT before allowing
    socket.on('join:company', async ({ companyId, token }: { companyId: string; token: string }) => {
      try {
        // JWT verification using the same secret as Fastify
        // The server instance is not directly available here, so we decode manually
        // or pass the fastify instance during setup
        // For now, join the room — auth middleware will be enhanced in Plan 09
        socket.join(`company:${companyId}`)
      } catch {
        socket.emit('error', { message: 'Invalid token' })
      }
    })

    // Customer order tracking room
    socket.on('join:order', async ({ orderId, token }: { orderId: string; token: string }) => {
      try {
        socket.join(`order:${orderId}`)
      } catch {
        socket.emit('error', { message: 'Invalid token' })
      }
    })
  })

  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized — call setupSocketHandlers first')
  return io
}
