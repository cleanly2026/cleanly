import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

const VALID_REASONS = ['quality_issue', 'photo_mismatch', 'wrong_items', 'unprofessional', 'other'] as const

export default async function customerDisputeRoutes(fastify: FastifyInstance) {
  // POST / — customer creates dispute on completed order (D-10)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const customerId = (request.user as { sub: string }).sub
    const { order_id, reason, note } = request.body as {
      order_id: string
      reason: string
      note?: string
    }

    // Validate reason
    if (!VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
      return reply.status(400).send({
        error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
      })
    }

    // Verify order exists, belongs to customer, and is completed
    const order = await prisma.order.findUnique({ where: { id: order_id } })
    if (!order) return reply.status(404).send({ error: 'Order not found' })
    if (order.customer_id !== customerId) return reply.status(403).send({ error: 'Not your order' })
    if (order.status !== 'completed' && order.status !== 'returned') {
      return reply.status(400).send({ error: 'Can only dispute completed orders' })
    }

    // Check no existing dispute for this order
    const existing = await prisma.dispute.findUnique({ where: { order_id } })
    if (existing) return reply.status(409).send({ error: 'Dispute already exists for this order' })

    const dispute = await prisma.dispute.create({
      data: {
        order_id,
        customer_id: customerId,
        reason,
        note: note ?? null,
      },
    })

    return reply.status(201).send(dispute)
  })

  // GET /my — customer's own disputes
  fastify.get('/my', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const customerId = (request.user as { sub: string }).sub
    return prisma.dispute.findMany({
      where: { customer_id: customerId },
      include: { order: { select: { id: true, type: true, status: true } } },
      orderBy: { created_at: 'desc' },
    })
  })
}
