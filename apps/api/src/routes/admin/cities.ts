import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export default async function adminCityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // GET /categories -- list distinct service categories (must be before /:id routes)
  fastify.get('/categories', async () => {
    const categories = await prisma.companyService.findMany({
      distinct: ['category'],
      select: { category: true },
    })
    return categories.map((c: { category: string }) => c.category)
  })

  // GET / -- list all cities (ADM-03)
  fastify.get('/', async () => {
    return prisma.city.findMany({ orderBy: { name_en: 'asc' } })
  })

  // POST / -- create city (ADM-03)
  fastify.post('/', async (request, reply) => {
    const { name_en, name_ar, country } = request.body as {
      name_en: string
      name_ar: string
      country?: string
    }
    if (!name_en || !name_ar) {
      return reply.status(400).send({ error: 'name_en and name_ar required' })
    }
    const city = await prisma.city.create({ data: { name_en, name_ar, country: country ?? 'AE' } })
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'city.create',
        entity: 'City',
        entity_id: city.id,
        metadata: { name_en },
      },
    })
    return city
  })

  // PATCH /:id -- update city (ADM-03)
  fastify.patch<{ Params: { id: string } }>('/:id', async (request) => {
    const { id } = request.params
    const data = request.body as { name_en?: string; name_ar?: string; is_active?: boolean }
    const city = await prisma.city.update({ where: { id }, data })
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'city.update',
        entity: 'City',
        entity_id: id,
        metadata: JSON.parse(JSON.stringify(data)),
      },
    })
    return city
  })

  // DELETE /:id -- soft-delete city (set is_active=false) (ADM-03)
  fastify.delete<{ Params: { id: string } }>('/:id', async (request) => {
    const { id } = request.params
    const city = await prisma.city.update({ where: { id }, data: { is_active: false } })
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'city.delete',
        entity: 'City',
        entity_id: id,
        metadata: { name_en: city.name_en },
      },
    })
    return { deleted: true }
  })
}
