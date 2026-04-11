import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'

/**
 * Health check routes (FLY-05).
 *
 * /healthz — liveness + dep check. Returns 200 when DB and Redis are reachable,
 *            503 otherwise. Used by Fly's [[http_service.checks]] and external
 *            uptime monitors.
 * /readyz  — readiness probe (same as /healthz at launch scale).
 *
 * Kept as a Fastify plugin so it registers cleanly from server.ts via
 * `server.register(healthRoutes)`.
 */
export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/healthz', async (_req, reply) => {
    const [dbResult, redisResult] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
    ])

    const db    = dbResult.status    === 'fulfilled' ? 'ok' : 'error'
    const cache = redisResult.status === 'fulfilled' ? 'ok' : 'error'
    const ok    = db === 'ok' && cache === 'ok'

    const body = {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        db: {
          status: db,
          error: dbResult.status === 'rejected' ? String(dbResult.reason).slice(0, 200) : undefined,
        },
        redis: {
          status: cache,
          error: redisResult.status === 'rejected' ? String(redisResult.reason).slice(0, 200) : undefined,
        },
      },
    }

    reply.code(ok ? 200 : 503).send(body)
  })

  fastify.get('/readyz', async (_req, reply) => {
    reply.code(200).send({ status: 'ok' })
  })

  // Backward-compat alias — pre-Phase 9 code called /health
  fastify.get('/health', async (_req, reply) => {
    reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() })
  })
}
