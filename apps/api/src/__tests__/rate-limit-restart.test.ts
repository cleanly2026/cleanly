import { describe, it, expect, afterAll } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import Redis from 'ioredis'

/**
 * Rate-limit restart-survival integration test (FLY-07).
 *
 * Proves that rate-limit counters are stored in Redis, not in-memory,
 * by verifying that a fresh Fastify instance connected to the same Redis
 * continues to enforce limits set by the previous instance.
 *
 * Requires UPSTASH_REDIS_URL in the environment (or defaults to localhost).
 */

const REDIS_URL = process.env.UPSTASH_REDIS_URL ?? 'redis://localhost:6379'
const useTls = REDIS_URL.startsWith('rediss://')
const TEST_NS = `cleanly-test-${Date.now()}-rl-`
const TEST_IP = '10.99.99.1'
const RATE_LIMIT_MAX = 3

// Shared Redis client for key inspection / cleanup
const inspectorRedis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(useTls ? { tls: {} } : {}),
})

/** Build a minimal Fastify app with the rate-limit plugin backed by Redis. */
async function buildRateLimitedApp(): Promise<FastifyInstance> {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(useTls ? { tls: {} } : {}),
  })

  const app = Fastify({ logger: false })

  await app.register(rateLimit, {
    global: false,
    redis,
    nameSpace: TEST_NS,
    skipOnError: false,
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
  })

  // Test route with a low rate limit
  app.get('/test-rate', {
    config: {
      rateLimit: {
        max: RATE_LIMIT_MAX,
        timeWindow: '1 minute',
      },
    },
  }, async () => {
    return { ok: true }
  })

  await app.ready()
  return app
}

// Cleanup all test keys after tests complete
afterAll(async () => {
  const keys = await inspectorRedis.keys(`${TEST_NS}*`)
  if (keys.length > 0) {
    await inspectorRedis.del(...keys)
  }
  await inspectorRedis.quit()
})

describe('Rate-limit restart survival (FLY-07)', () => {
  it('rejects the (max+1)th request with 429', async () => {
    const app = await buildRateLimitedApp()

    try {
      // Send RATE_LIMIT_MAX requests -- all should succeed
      for (let i = 0; i < RATE_LIMIT_MAX; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/test-rate',
          headers: { 'x-forwarded-for': TEST_IP },
        })
        expect(res.statusCode).toBe(200)
      }

      // The next request should be rate-limited
      const blocked = await app.inject({
        method: 'GET',
        url: '/test-rate',
        headers: { 'x-forwarded-for': TEST_IP },
      })
      expect(blocked.statusCode).toBe(429)
    } finally {
      await app.close()
    }
  })

  it('stores rate-limit keys in Redis (not in-memory)', async () => {
    // Keys were set by the previous test. Scan for them.
    const keys = await inspectorRedis.keys(`${TEST_NS}*`)
    expect(keys.length).toBeGreaterThan(0)
  })

  it('preserves rate-limit count across a fresh Fastify instance (restart survival)', async () => {
    // A brand-new Fastify instance with the SAME namespace and Redis
    const freshApp = await buildRateLimitedApp()

    try {
      // The IP was already at the limit from the first test.
      // Even on a fresh process, the very first request should be blocked.
      const res = await freshApp.inject({
        method: 'GET',
        url: '/test-rate',
        headers: { 'x-forwarded-for': TEST_IP },
      })
      expect(res.statusCode).toBe(429)
    } finally {
      await freshApp.close()
    }
  })
})
