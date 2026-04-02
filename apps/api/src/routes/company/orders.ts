import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const querySchema = z.object({
  status: z
    .enum([
      'all',
      'pending',
      'accepted',
      'washer_assigned',
      'washer_en_route',
      'in_progress',
      'completed',
      'cancelled',
      'pickup_scheduled',
      'picked_up',
      'in_cleaning',
      'ready_for_return',
      'return_scheduled',
      'out_for_return',
      'returned',
    ])
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function companyOrdersRoute(fastify: FastifyInstance) {
  // GET /company/orders — paginated order feed for company dashboard (COMP-05)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { sub: string; companyId?: string }
    if (!user.companyId) return reply.code(403).send({ error: 'Not a company admin' })

    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message })
    const { status, page, limit } = parsed.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { company_id: user.companyId }
    if (status !== 'all') where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              phone: true,
              // Use first_name/last_name if present via washer_profile relation
            },
          },
          items: {
            include: { package: { select: { name_en: true, name_ar: true } } },
          },
          washer: {
            select: { id: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return {
      orders: orders.map((o) => ({
        id: o.id,
        // order_number not in schema — use id prefix as display reference
        order_number: `CLN-${o.id.slice(0, 8).toUpperCase()}`,
        customer_name: o.customer.phone ?? o.customer.id,
        service_category: o.type,
        status: o.status,
        // amount_total is stored in fils — expose as-is; frontend divides by 100
        total_amount: o.amount_total,
        created_at: o.created_at,
        washer: o.washer ? { id: o.washer.id, name: o.washer.id } : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  })

  // GET /company/orders/washers/available — list active washers for assignment dropdown (COMP-06)
  fastify.get('/washers/available', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { sub: string; companyId?: string }
    if (!user.companyId) return reply.code(403).send({ error: 'Not a company admin' })

    // Washers are User records with role='washer' and company_id matching the company
    const washers = await prisma.user.findMany({
      where: { company_id: user.companyId, role: 'washer' },
      select: {
        id: true,
        phone: true,
        washer_profile: { select: { is_online: true } },
      },
    })

    return {
      washers: washers.map((w) => ({
        id: w.id,
        first_name: w.phone ?? w.id,
        last_name: '',
        status: w.washer_profile?.is_online ? 'online' : 'offline',
      })),
    }
  })
}
