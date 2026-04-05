import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { createRefund, createPartialRefund } from '../../services/stripe.service.js'

export default async function adminRefundRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // POST /:disputeId/refund -- issue refund for a dispute (ADM-05, D-12, D-13)
  fastify.post<{ Params: { disputeId: string } }>('/:disputeId/refund', async (request, reply) => {
    const { disputeId } = request.params
    const { type, amount, reason } = request.body as {
      type: 'full' | 'partial'
      amount?: number // in fils, required if partial
      reason: string
    }

    if (!reason || reason.length < 10) {
      return reply.status(400).send({ error: 'Reason required (min 10 characters)' })
    }

    const dispute = await prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
      include: { order: { select: { payment_intent_id: true, amount_total: true, id: true } } },
    })

    if (!dispute.order.payment_intent_id) {
      return reply.status(400).send({ error: 'Order has no payment intent -- cannot refund' })
    }

    if (type === 'partial' && (!amount || amount <= 0 || amount > dispute.order.amount_total)) {
      return reply
        .status(400)
        .send({ error: `Partial amount must be between 1 and ${dispute.order.amount_total} fils` })
    }

    let refund
    if (type === 'full') {
      refund = await createRefund(dispute.order.payment_intent_id)
    } else {
      refund = await createPartialRefund(dispute.order.payment_intent_id, amount!, reason)
    }

    // Update dispute with refund info
    const refundAmount = type === 'full' ? dispute.order.amount_total : (amount ?? null)
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution: reason,
        ...(refundAmount !== null ? { refund_amount: refundAmount } : {}),
      },
    })

    // Update order payment status
    await prisma.order.update({
      where: { id: dispute.order_id },
      data: { payment_status: type === 'full' ? 'refunded' : 'partially_refunded' },
    })

    // Audit log (ADM-06, D-13)
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'dispute.refund',
        entity: 'Dispute',
        entity_id: disputeId,
        metadata: {
          type,
          amount: type === 'full' ? dispute.order.amount_total : amount,
          reason,
          stripe_refund_id: refund.id,
          order_id: dispute.order_id,
        },
      },
    })

    return {
      refund_id: refund.id,
      type,
      amount: type === 'full' ? dispute.order.amount_total : amount,
    }
  })
}
