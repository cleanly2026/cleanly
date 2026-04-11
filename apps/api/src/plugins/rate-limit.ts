import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { redis } from '../lib/redis.js'
import { env } from '../lib/env.js'

/**
 * Rate limit plugin — FLY-07.
 *
 * Redis-backed so rate limits survive API restarts (in-memory would reset on
 * every cold start, defeating OTP abuse protection).
 *
 * `nameSpace` differentiates staging and production keys in a shared Upstash
 * instance. Without this, staging load tests would poison production limits.
 *
 * `skipOnError: false` — if Redis is unreachable, fail CLOSED. A brief outage
 * is safer than an SMS bombing attack that racks up Twilio bills.
 */
export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: false,
    redis,
    nameSpace: `cleanly-${env.NODE_ENV}-rl-`,
    skipOnError: false,
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string) ?? req.ip,
  })
})
