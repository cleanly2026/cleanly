import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { redis } from '../lib/redis.js'

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: false,                // Apply per-route only — not globally
    redis,
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
  })
})
