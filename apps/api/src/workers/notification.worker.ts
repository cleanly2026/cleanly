import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'

// Idempotency key prefix — prevents double-sends on retry
const SENT_KEY_TTL = 7 * 24 * 60 * 60  // 7 days in seconds

const worker = new Worker(
  'notifications',
  async (job) => {
    // Idempotency: check if this job was already processed
    const alreadySent = await redis.get(`job:sent:${job.id}`)
    if (alreadySent) {
      console.log(`[Worker] Job ${job.id} already processed — skipping`)
      return { skipped: true }
    }

    console.log(`[Worker] Processing notification job ${job.id}:`, job.data)

    // Phase 4 will implement actual notification channels here.
    // For now: log the job data and mark as sent.
    await redis.set(`job:sent:${job.id}`, '1', 'EX', SENT_KEY_TTL)

    return { sent: true, jobId: job.id }
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
})

// Graceful shutdown — CRITICAL to avoid stalled jobs on Railway deploy
async function shutdown(signal: string) {
  console.log(`[Worker] Received ${signal} — shutting down gracefully`)
  await worker.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

console.log('[Worker] Notification worker started')
