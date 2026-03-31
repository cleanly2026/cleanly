import Fastify from 'fastify'
import { initSentry } from './lib/sentry.js'
import authPlugin from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import zodPlugin from './plugins/zod-provider.js'

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

// Auth routes registered in Plans 06 and 07
// server.register(authRoutes, { prefix: '/auth' })

const port = parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await server.listen({ port, host })
  console.log(`[API] Server running on http://${host}:${port}`)
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
