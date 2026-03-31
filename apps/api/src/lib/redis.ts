import Redis from 'ioredis'

// maxRetriesPerRequest: null is REQUIRED for BullMQ (documented requirement).
// tls: {} is REQUIRED for Upstash (all Upstash Redis requires TLS).
export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},
  retryStrategy(times) {
    if (times > 10) return null  // Stop retrying after 10 attempts
    return Math.min(times * 200, 2000)  // Exponential backoff
  },
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message)
})
