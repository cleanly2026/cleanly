import { Queue } from 'bullmq'
import { redis } from './redis.js'

// Shared order queue for background jobs: payout scheduling, washer response timeouts, etc.
// Workers consume this queue in a separate process (apps/api/src/workers/order.worker.ts).
export const orderQueue = new Queue('orders', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})

orderQueue.on('error', (err) => {
  console.error('[Queue] orderQueue error:', err.message)
})
