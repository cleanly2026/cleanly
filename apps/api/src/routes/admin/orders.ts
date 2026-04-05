import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export default async function adminOrderRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // GET / -- platform-wide order list with filters (ADM-02)
  // Query: ?status=pending|completed|..., ?page=1, ?limit=10
  fastify.get('/', async (request) => {
    const { status, page = '1', limit = '10' } = request.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = status ? { status: status as any } : {}
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, phone: true, preferred_language: true } },
          company: { select: { id: true, name_en: true, name_ar: true } },
          washer: { select: { id: true, phone: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ])
    return { orders, total, page: parseInt(page), limit: parseInt(limit) }
  })

  // GET /:id -- order detail (ADM-02)
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    return prisma.order.findUniqueOrThrow({
      where: { id: request.params.id },
      include: {
        customer: { select: { id: true, phone: true, email: true, preferred_language: true } },
        company: { select: { id: true, name_en: true, name_ar: true, stripe_account_id: true } },
        washer: { select: { id: true, phone: true } },
        items: { include: { package: { select: { name_en: true, name_ar: true } } } },
        carpet_details: true,
        dispute: true,
      },
    })
  })
}
