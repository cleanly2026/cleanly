import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function customerOrderRoutes(fastify: FastifyInstance) {

  // GET /customer/orders — list customer's orders (most recent first)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const customerId = (request.user as { sub: string }).sub

    const orders = await prisma.order.findMany({
      where: { customer_id: customerId },
      include: {
        items: {
          include: {
            package: { select: { name_en: true, name_ar: true } },
          },
        },
        carpet_details: true,
        company: { select: { name_en: true, name_ar: true, slug: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    return { orders }
  })

  // GET /customer/orders/:id — single order detail
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params
    const customerId = (request.user as { sub: string }).sub

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            package: {
              select: {
                name_en: true,
                name_ar: true,
                add_ons: {
                  select: { id: true, name_en: true, name_ar: true, price: true },
                },
              },
            },
          },
        },
        carpet_details: true,
        company: { select: { name_en: true, name_ar: true, slug: true, logo_url: true } },
      },
    })

    if (!order || order.customer_id !== customerId) {
      return reply.status(404).send({ error: 'Order not found' })
    }

    return order
  })
}
