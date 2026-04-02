import type { FastifyInstance } from 'fastify'
import { companyProfileSchema } from '@cleanly/types'
import { prisma } from '../../lib/prisma.js'

export async function companyProfileRoutes(fastify: FastifyInstance) {
  // GET /company/profile — fetch current company profile
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        id: true, name_en: true, name_ar: true, description_en: true, description_ar: true,
        slug: true, logo_url: true, city_id: true, is_verified: true,
        stripe_account_id: true, commission_rate: true, carpet_lead_time_days: true,
      },
    })
    return company
  })

  // PUT /company/profile — update bilingual profile (COMP-01)
  fastify.put('/', {
    preHandler: [fastify.authenticate],
    schema: { body: companyProfileSchema },
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const body = request.body as any
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name_en: body.name_en,
        name_ar: body.name_ar,
        description_en: body.description_en,
        description_ar: body.description_ar,
        logo_url: body.logo_url ?? undefined,
      },
    })
    return company
  })
}
