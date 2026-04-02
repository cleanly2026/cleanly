import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function cityRoutes(fastify: FastifyInstance) {
  // GET /cities — public, no auth required (DISC-02 fallback for city picker)
  fastify.get('/', async () => {
    const cities = await prisma.city.findMany({
      where: { is_active: true },
      select: { id: true, name_en: true, name_ar: true, country: true },
      orderBy: { name_en: 'asc' },
    })
    return { cities }
  })
}
