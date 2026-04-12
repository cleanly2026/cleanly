import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { env } from './env.js'
import { redis } from './redis.js'
import { registerJobDispatchHandlers } from './job-dispatch.js'

let io: SocketServer

export function setupSocketHandlers(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: [
        env.CUSTOMER_WEB_URL,
        env.COMPANY_WEB_URL,
        env.CUSTOMER_MOBILE_URL,
        env.WASHER_MOBILE_URL,
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // RT-04: allowEIO3 for React Native Socket.io client compatibility
    allowEIO3: true,
  })

  // RT-04: Redis adapter for horizontal scaling — use separate pub/sub clients
  // Do NOT reuse the existing `redis` singleton — BullMQ requires maxRetriesPerRequest:null
  // which conflicts with pub/sub adapter usage pattern.
  const pubClient = new Redis(env.UPSTASH_REDIS_URL, {
    tls: {},
    retryStrategy(times) {
      if (times > 10) return null
      return Math.min(times * 200, 2000)
    },
  })
  const subClient = pubClient.duplicate()

  pubClient.on('error', (err) => {
    console.error('[Socket.io Redis pub] Connection error:', err.message)
  })
  subClient.on('error', (err) => {
    console.error('[Socket.io Redis sub] Connection error:', err.message)
  })

  io.adapter(createAdapter(pubClient, subClient))

  io.on('connection', (socket) => {
    // Pitfall 1 fix: Auto-join washer personal room from JWT on connection
    // Ensures washer:{userId} room is joined even if washer:join-order is never called
    const token = socket.handshake.auth?.token as string | undefined
    if (token) {
      try {
        // Decode JWT payload without crypto verification — lightweight, no dep needed
        const parts = token.split('.')
        const payloadSegment = parts[1]
        if (payloadSegment) {
          const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString())
          if (payload.role === 'washer' && payload.sub) {
            socket.join(`washer:${payload.sub}`)
            ;(socket as any).userId = payload.sub
          }
        }
        // Malformed JWT (no payload segment) — skip, washer:join-order still works as fallback
      } catch {
        // Invalid or malformed token — no-op, washer:join-order still works as fallback
      }
    }

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

    // RT-01: Washer joins order room for GPS broadcasting
    // Also stores userId on socket for downstream handlers
    socket.on('washer:join-order', ({ orderId, userId }: { orderId: string; userId: string }) => {
      // Store userId on socket for use by location handler
      ;(socket as any).userId = userId
      socket.join(`order:${orderId}`)
      // Also join personal room for direct job alerts
      socket.join(`washer:${userId}`)
    })

    // RT-05: GPS location handler — cache in Redis with 30s TTL, never write to DB per ping
    socket.on('washer:location', async ({ orderId, lat, lng, heading }: { orderId: string; lat: number; lng: number; heading?: number }) => {
      const userId = (socket as any).userId as string | undefined
      if (!userId) return

      // Cache in Redis with 30s TTL — RT-05 requirement
      const locationKey = `washer:location:${userId}`
      const locationData = JSON.stringify({ lat, lng, heading, ts: Date.now() })
      await redis.set(locationKey, locationData, 'EX', 30)

      // Broadcast to all room members (customer, company) — RT-01
      io.to(`order:${orderId}`).emit('order:washer_location', { lat, lng, heading })
    })

    // Washer leaves order room
    socket.on('washer:leave-order', ({ orderId }: { orderId: string }) => {
      socket.leave(`order:${orderId}`)
    })

    // INT-04 fix: Register job dispatch handlers (job:accept, job:decline) per D-04
    registerJobDispatchHandlers(socket)
  })

  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized — call setupSocketHandlers first')
  return io
}
