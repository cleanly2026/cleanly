import { Queue } from 'bullmq'
import { redis } from '../lib/redis.js'

// Notification queue — used in Phase 4 for multi-channel notifications.
// Scaffolded here so the Queue instance is available for enqueueing
// throughout Phases 2 and 3.
export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})
