import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { transitionOrderStatus } from '../../services/order.service.js'
import { getIO } from '../../lib/socket.js'
import { orderQueue } from '../../lib/queue.js'
import { notificationQueue } from '../../queues/queues.js'
import {
  assignWasherSchema,
  washerResponseSchema,
  transitionOrderStatusSchema,
  OrderStatus,
} from '@cleanly/types'

// --- Notification dispatch helpers (D-02 tier matrix, NOTF-01 through NOTF-05) ---

// Map order status to notification event name
const STATUS_TO_EVENT: Record<string, string> = {
  accepted: 'order_confirmed',
  washer_assigned: 'washer_assigned',
  washer_en_route: 'washer_en_route',
  in_progress: 'washer_arrived',
  completed: 'completed',
  cancelled: 'job_cancelled',
  pickup_scheduled: 'carpet_picked_up',
  picked_up: 'carpet_picked_up',
  in_cleaning: 'carpet_picked_up',
  ready_for_return: 'carpet_ready_for_return',
  out_for_return: 'carpet_out_for_return',
  returned: 'carpet_returned',
}

// D-02: SMS + WhatsApp only for critical events (reduces noise)
const CRITICAL_EVENTS = ['order_confirmed', 'washer_en_route', 'completed', 'refund_issued']

type OrderForNotif = {
  id: string
  customer_id: string
  company_id: string
  washer_id: string | null
  type: string
  amount_total: number
  platform_fee: number
}

async function dispatchCustomerNotifications(
  order: OrderForNotif,
  targetStatus: string
): Promise<void> {
  const event = STATUS_TO_EVENT[targetStatus]
  if (!event) return

  const customer = await prisma.user.findUnique({
    where: { id: order.customer_id },
    select: { expo_push_token: true, phone: true, email: true, preferred_language: true },
  })
  if (!customer) return

  const lang = (customer.preferred_language as 'en' | 'ar') ?? 'en'

  // Push — all events (D-02)
  if (customer.expo_push_token) {
    await notificationQueue.add('send-push', {
      pushToken: customer.expo_push_token,
      event,
      orderId: order.id,
      language: lang,
      data: {},
    })
  }

  // SMS + WhatsApp — critical events only (D-02)
  if (CRITICAL_EVENTS.includes(event) && customer.phone) {
    await notificationQueue.add('send-sms', {
      phone: customer.phone,
      event,
      language: lang,
      data: {},
    })
    await notificationQueue.add('send-whatsapp', {
      phone: customer.phone,
      event,
      language: lang,
    })
  }

  // Email receipt — completion only (D-02)
  if ((targetStatus === 'completed' || targetStatus === 'returned') && customer.email) {
    const company = await prisma.company.findUnique({
      where: { id: order.company_id },
      select: { name_en: true, name_ar: true },
    })
    if (company) {
      await notificationQueue.add('send-email-receipt', {
        email: customer.email,
        orderId: order.id,
        orderNumber: `CLN-${order.id.slice(0, 8)}`,
        language: lang,
        serviceName: order.type,
        amountTotal: order.amount_total,
        platformFee: order.platform_fee,
        companyName: lang === 'ar' ? company.name_ar : company.name_en,
        completedAt: new Date().toISOString(),
      })
    }
  }

  // D-04: Notify washer when customer cancels (push only for washers)
  if (targetStatus === 'cancelled' && order.washer_id) {
    const washer = await prisma.user.findUnique({
      where: { id: order.washer_id },
      select: { expo_push_token: true, preferred_language: true },
    })
    if (washer?.expo_push_token) {
      await notificationQueue.add('send-push', {
        pushToken: washer.expo_push_token,
        event: 'job_cancelled',
        orderId: order.id,
        language: (washer.preferred_language as 'en' | 'ar') ?? 'en',
        data: { id: order.id.slice(0, 8) },
      })
    }
  }
}

export async function orderLifecycleRoutes(fastify: FastifyInstance) {

  // PATCH /orders/:id/status — generic state transition (ORD-01, CARP-05, ORD-05)
  // Used by company to advance order through states
  fastify.patch<{ Params: { id: string } }>('/:id/status', {
    preHandler: [fastify.authenticate],
    schema: { body: transitionOrderStatusSchema },
  }, async (request, reply) => {
    const { id: orderId } = request.params
    const { status: targetStatus } = request.body as { status: string }

    try {
      await transitionOrderStatus(orderId, targetStatus as OrderStatus)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transition failed'
      return reply.status(400).send({ error: message })
    }

    // Emit real-time update to both company and customer rooms
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    const io = getIO()
    io.to(`company:${order.company_id}`).emit('order:status-changed', { orderId, status: targetStatus })
    io.to(`order:${orderId}`).emit('order:status-changed', { orderId, status: targetStatus })

    // If completed, queue payout job via BullMQ (D-20, PAY-04)
    if (targetStatus === OrderStatus.completed) {
      await orderQueue.add('schedule-payout', {
        order_id: orderId,
        transfer_amount: order.amount_subtotal, // company gets subtotal (platform fee already deducted)
        destination: '', // Will be fetched in worker from company.stripe_account_id
      }, { delay: 7 * 24 * 60 * 60 * 1000 }) // 7-day delay (PAY-04)
    }

    // Dispatch notifications per D-02 tier matrix (NOTF-01 through NOTF-05)
    await dispatchCustomerNotifications(order, targetStatus)

    return { orderId, status: targetStatus }
  })

  // PATCH /orders/:id/assign-washer — company assigns washer (ORD-03, COMP-06)
  fastify.patch<{ Params: { id: string } }>('/:id/assign-washer', {
    preHandler: [fastify.authenticate],
    schema: { body: assignWasherSchema },
  }, async (request, reply) => {
    const { id: orderId } = request.params
    const { washer_id } = request.body as { washer_id: string }
    const companyId = (request.user as { companyId?: string }).companyId

    if (!companyId) {
      return reply.status(403).send({ error: 'Company context required' })
    }

    // Verify washer belongs to this company
    const washer = await prisma.user.findFirst({
      where: { id: washer_id, company_id: companyId, role: 'washer' },
    })
    if (!washer) return reply.status(404).send({ error: 'Washer not found in your company' })

    // Transition to washer_assigned (uses FOR UPDATE locking via transitionOrderStatus)
    try {
      await transitionOrderStatus(orderId, OrderStatus.washer_assigned)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transition failed'
      return reply.status(400).send({ error: message })
    }

    // Set washer_id on order
    await prisma.order.update({
      where: { id: orderId },
      data: { washer_id },
    })

    // Emit updates
    const io = getIO()
    io.to(`company:${companyId}`).emit('order:status-changed', { orderId, status: 'washer_assigned' })
    io.to(`order:${orderId}`).emit('order:status-changed', { orderId, status: 'washer_assigned' })

    // Queue 30s auto-decline timer (ORD-04)
    await orderQueue.add('washer-response-timeout', {
      order_id: orderId,
      washer_id,
    }, { delay: 30 * 1000, jobId: `washer-timeout-${orderId}` })

    // D-04: Notify washer of new job assignment (push only for washers)
    const assignedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    if (washer.expo_push_token) {
      await notificationQueue.add('send-push', {
        pushToken: washer.expo_push_token,
        event: 'new_job_assignment',
        orderId,
        language: (washer.preferred_language as 'en' | 'ar') ?? 'en',
        data: { service: assignedOrder.type },
      })
    }

    return { orderId, status: 'washer_assigned', washer_id }
  })

  // POST /orders/:id/washer-response — washer accepts/declines (ORD-04)
  fastify.post<{ Params: { id: string } }>('/:id/washer-response', {
    preHandler: [fastify.authenticate],
    schema: { body: washerResponseSchema },
  }, async (request, reply) => {
    const { id: orderId } = request.params
    const { accepted } = request.body as { accepted: boolean }
    const washerId = (request.user as { sub: string }).sub

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })

    // Verify this washer is assigned to this order
    if (order.washer_id !== washerId) {
      return reply.status(403).send({ error: 'Not assigned to this order' })
    }

    if (accepted) {
      // Transition to washer_en_route (uses FOR UPDATE locking)
      try {
        await transitionOrderStatus(orderId, OrderStatus.washer_en_route)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transition failed'
        return reply.status(400).send({ error: message })
      }

      // Cancel the auto-decline timer
      const job = await orderQueue.getJob(`washer-timeout-${orderId}`)
      if (job) await job.remove()

      const io = getIO()
      io.to(`company:${order.company_id}`).emit('order:status-changed', { orderId, status: 'washer_en_route' })
      io.to(`order:${orderId}`).emit('order:status-changed', { orderId, status: 'washer_en_route' })

      return { orderId, status: 'washer_en_route' }
    } else {
      // Washer declined — revert to accepted, clear washer_id
      await prisma.order.update({
        where: { id: orderId },
        data: { washer_id: null, status: 'accepted' },
      })

      // Cancel the auto-decline timer
      const job = await orderQueue.getJob(`washer-timeout-${orderId}`)
      if (job) await job.remove()

      const io = getIO()
      io.to(`company:${order.company_id}`).emit('order:status-changed', { orderId, status: 'accepted' })

      return { orderId, status: 'accepted' }
    }
  })

  // DELETE /orders/:id — customer cancellation (ORD-06)
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id: orderId } = request.params
    const customerId = (request.user as { sub: string }).sub

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })

    // Verify customer owns this order
    if (order.customer_id !== customerId) {
      return reply.status(403).send({ error: 'Not your order' })
    }

    // Cancellation policy: free before washer_assigned, fee after (ORD-06)
    const freeStatuses = ['pending', 'accepted']
    const cancellationFee = freeStatuses.includes(order.status)
      ? 0
      : Math.round(order.amount_total * 0.15) // 15% cancellation fee

    try {
      await transitionOrderStatus(orderId, OrderStatus.cancelled)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transition failed'
      return reply.status(400).send({ error: message })
    }

    const io = getIO()
    io.to(`company:${order.company_id}`).emit('order:status-changed', { orderId, status: 'cancelled' })
    io.to(`order:${orderId}`).emit('order:status-changed', { orderId, status: 'cancelled' })

    // Dispatch cancellation notifications — includes washer push if washer was assigned (D-04)
    await dispatchCustomerNotifications(order, 'cancelled')

    // If payment was captured and no fee, refund fully.
    // If fee applies, refund minus fee.
    // Actual refund/partial-refund logic handled in Stripe webhook plan.

    return { orderId, status: 'cancelled', cancellation_fee: cancellationFee }
  })

  // PATCH /orders/:id/carpet-return-date — reschedule return (CARP-04)
  fastify.patch<{ Params: { id: string } }>('/:id/carpet-return-date', {
    preHandler: [fastify.authenticate],
    schema: { body: z.object({ return_date: z.string().datetime() }) },
  }, async (request, reply) => {
    const { id: orderId } = request.params
    const { return_date } = request.body as { return_date: string }
    const customerId = (request.user as { sub: string }).sub

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { carpet_details: true },
    })

    if (order.customer_id !== customerId) {
      return reply.status(403).send({ error: 'Not your order' })
    }

    // Can only reschedule before out_for_return (CARP-04)
    const blockedStatuses = ['out_for_return', 'returned', 'completed', 'cancelled']
    if (blockedStatuses.includes(order.status)) {
      return reply.status(400).send({ error: 'Cannot reschedule at this stage' })
    }

    if (!order.carpet_details) {
      return reply.status(400).send({ error: 'Not a carpet order' })
    }

    await prisma.carpetOrderDetails.update({
      where: { order_id: orderId },
      data: { return_date: new Date(return_date) },
    })

    return { orderId, return_date }
  })
}
