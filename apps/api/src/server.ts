import Fastify from 'fastify'
import { initSentry } from './lib/sentry.js'
import authPlugin from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import zodPlugin from './plugins/zod-provider.js'
import { otpRoutes } from './routes/auth/otp.js'
import { washerRoutes } from './routes/auth/washer.js'

// Initialize Sentry before anything else
initSentry()

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

// Register plugins
await server.register(corsPlugin)
await server.register(rateLimitPlugin)
await server.register(authPlugin)
await server.register(zodPlugin)

// Health check (no auth required)
server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}))

// Auth routes — Plan 06: phone OTP (customers) and OTP+PIN (washers)
await server.register(otpRoutes, { prefix: '/auth/otp' })
await server.register(washerRoutes, { prefix: '/auth/washer' })

const port = parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await server.listen({ port, host })
  console.log(`[API] Server running on http://${host}:${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
