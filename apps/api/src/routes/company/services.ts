import type { FastifyInstance } from 'fastify'
import { companyServicesSchema } from '@cleanly/types'
import { prisma } from '../../lib/prisma.js'

export async function companyServicesRoutes(fastify: FastifyInstance) {
  // GET /company/services
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const services = await prisma.companyService.findMany({ where: { company_id: companyId } })
    return { services }
  })

  // PUT /company/services — update city coverage + categories (COMP-02)
  fastify.put('/', {
    preHandler: [fastify.authenticate],
    schema: { body: companyServicesSchema },
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const body = request.body as any

    // Delete existing and recreate (simple replace pattern)
    await prisma.$transaction(async (tx: any) => {
      await tx.companyService.deleteMany({ where: { company_id: companyId } })

      const records = body.categories.map((category: string) => ({
        company_id: companyId,
        category,
      }))
      await tx.companyService.createMany({ data: records })

      // Update company city to first selected city (company has single city_id)
      await tx.company.update({
        where: { id: companyId },
        data: { city_id: body.city_ids[0] },
      })
    })

    return { success: true }
  })
}
