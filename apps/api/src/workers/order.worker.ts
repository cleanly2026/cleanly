import { Worker, type Job } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { stripe, createRefund } from '../services/stripe.service.js'

const worker = new Worker(
  'orders',  // MUST match queue name in lib/queue.ts — NOT 'order-lifecycle'
  async (job: Job) => {
    switch (job.name) {

      case 'schedule-payout': {
        // PAY-04: Company payout via Stripe Connect after 7-day delay
        const { order_id } = job.data

        const order = await prisma.order.findUniqueOrThrow({
          where: { id: order_id },
          include: { company: { select: { stripe_account_id: true } } },
        })

        // Skip if not paid (disputed, refunded, etc.)
        if (order.payment_status !== 'paid') {
          console.log(`[order-worker] Skipping payout for order ${order_id}: payment_status=${order.payment_status}`)
          return { skipped: true, reason: order.payment_status }
        }

        if (!order.company.stripe_account_id) {
          console.error(`[order-worker] Company has no Stripe account for order ${order_id}`)
          throw new Error(`No Stripe account for order ${order_id}`)
        }

        // Create transfer with idempotency key to prevent double-payout on retry
        await stripe.transfers.create({
          amount: order.amount_subtotal,
          currency: 'aed',
          destination: order.company.stripe_account_id,
          transfer_group: order_id,
        }, {
          idempotencyKey: `payout-${order_id}`,
        })

        console.log(`[order-worker] Payout transfer created for order ${order_id}, amount: ${order.amount_subtotal} fils`)
        return { transferred: true, order_id }
      }

      case 'washer-response-timeout': {
        // ORD-04: Auto-decline after 30s if washer hasn't responded
        const { order_id, washer_id } = job.data

        const order = await prisma.order.findUnique({ where: { id: order_id } })
        if (!order) {
          console.log(`[order-worker] Order ${order_id} not found for timeout — skipping`)
          return { skipped: true }
        }

        // Only auto-decline if still in washer_assigned state with same washer
        if (order.status === 'washer_assigned' && order.washer_id === washer_id) {
          await prisma.order.update({
            where: { id: order_id },
            data: { washer_id: null, status: 'accepted' },
          })
          console.log(`[order-worker] Washer ${washer_id} auto-declined for order ${order_id}`)
          return { auto_declined: true, order_id, washer_id }
        }

        console.log(`[order-worker] Timeout no-op for order ${order_id}: status=${order.status}, washer=${order.washer_id}`)
        return { skipped: true, reason: 'state_changed' }
      }

      case 'process-refund': {
        // PAY-06: Refund with reverse transfer
        const { order_id } = job.data

        const order = await prisma.order.findUniqueOrThrow({ where: { id: order_id } })
        if (!order.payment_intent_id) {
          console.error(`[order-worker] No payment_intent_id for order ${order_id}`)
          throw new Error(`No payment_intent_id for order ${order_id}`)
        }

        // createRefund uses reverse_transfer: true and refund_application_fee: true
        await createRefund(order.payment_intent_id)

        await prisma.order.update({
          where: { id: order_id },
          data: { payment_status: 'refunded' },
        })

        console.log(`[order-worker] Refund processed for order ${order_id}`)
        return { refunded: true, order_id }
      }

      default:
        console.warn(`[order-worker] Unknown job name: ${job.name}`)
        return { skipped: true, reason: 'unknown_job' }
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

worker.on('completed', (job) => {
  console.log(`[order-worker] Job ${job.id} (${job.name}) completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[order-worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
})

// Graceful shutdown — CRITICAL to avoid stalled jobs on Railway/Fly.io deploy
async function shutdown(signal: string) {
  console.log(`[order-worker] Received ${signal} — shutting down gracefully`)
  await worker.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

console.log('[order-worker] Order worker started — listening on queue: orders')
