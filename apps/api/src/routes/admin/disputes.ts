import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export default async function adminDisputeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // GET / -- dispute list (ADM-04)
  // Query: ?status=open|resolved, ?page=1, ?limit=10
  fastify.get('/', async (request) => {
    const { status, page = '1', limit = '10' } = request.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = status ? { status } : {}
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              type: true,
              status: true,
              amount_total: true,
              before_photo_url: true,
              after_photo_url: true,
            },
          },
          customer: { select: { id: true, phone: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.dispute.count({ where }),
    ])
    return { disputes, total, page: parseInt(page), limit: parseInt(limit) }
  })

  // GET /:id -- dispute detail with photo URLs (ADM-04, D-11)
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    const dispute = await prisma.dispute.findUniqueOrThrow({
      where: { id: request.params.id },
      include: {
        order: {
          include: {
            customer: { select: { id: true, phone: true, email: true } },
            company: { select: { id: true, name_en: true, name_ar: true } },
            washer: { select: { id: true, phone: true } },
            items: { include: { package: { select: { name_en: true, name_ar: true } } } },
            carpet_details: true,
          },
        },
        customer: { select: { id: true, phone: true } },
      },
    })
    // Photo URLs stored as full public URLs (from getPublicUrl) -- return as-is
    return dispute
  })

  // PATCH /:id/resolve -- mark dispute as resolved (ADM-04)
  fastify.patch<{ Params: { id: string } }>('/:id/resolve', async (request) => {
    const { id } = request.params
    const { resolution } = request.body as { resolution?: string }
    const dispute = await prisma.dispute.update({
      where: { id },
      data: { status: 'resolved', resolution: resolution ?? 'Resolved by admin' },
    })
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'dispute.resolve',
        entity: 'Dispute',
        entity_id: id,
        metadata: { order_id: dispute.order_id },
      },
    })
    return dispute
  })
}
