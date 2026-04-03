import type { FastifyInstance } from 'fastify'
import { packageSchema, addOnSchema } from '@cleanly/types'
import { prisma } from '../../lib/prisma.js'

export async function companyPackageRoutes(fastify: FastifyInstance) {
  // GET /company/packages — list all packages for this company
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const packages = await prisma.package.findMany({
      where: { company_id: companyId },
      include: { add_ons: true },
      orderBy: { created_at: 'desc' },
    })
    return { packages }
  })

  // POST /company/packages — create a new package (COMP-03)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: { body: packageSchema },
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const body = request.body as any

    const pkg = await prisma.package.create({
      data: {
        company_id: companyId,
        category: body.category,
        name_en: body.name_en,
        name_ar: body.name_ar,
        description_en: body.description_en,
        description_ar: body.description_ar,
        base_price: body.base_price,
      },
    })
    return reply.status(201).send(pkg)
  })

  // PUT /company/packages/:id — update a package
  fastify.put('/:id', {
    preHandler: [fastify.authenticate],
    schema: { body: packageSchema },
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const { id } = request.params as { id: string }
    const body = request.body as any

    const existing = await prisma.package.findFirst({
      where: { id, company_id: companyId },
    })
    if (!existing) return reply.status(404).send({ error: 'Package not found' })

    const updated = await prisma.package.update({
      where: { id },
      data: {
        category: body.category,
        name_en: body.name_en,
        name_ar: body.name_ar,
        description_en: body.description_en,
        description_ar: body.description_ar,
        base_price: body.base_price,
      },
    })
    return updated
  })

  // DELETE /company/packages/:id — soft delete (is_active: false)
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const { id } = request.params as { id: string }

    const existing = await prisma.package.findFirst({
      where: { id, company_id: companyId },
    })
    if (!existing) return reply.status(404).send({ error: 'Package not found' })

    await prisma.package.update({
      where: { id },
      data: { is_active: false },
    })
    return { success: true }
  })

  // POST /company/packages/:id/add-ons — create add-on for a package
  fastify.post('/:id/add-ons', {
    preHandler: [fastify.authenticate],
    schema: { body: addOnSchema },
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const { id: packageId } = request.params as { id: string }
    const body = request.body as any

    // Verify package ownership
    const pkg = await prisma.package.findFirst({
      where: { id: packageId, company_id: companyId },
    })
    if (!pkg) return reply.status(404).send({ error: 'Package not found' })

    const addOn = await prisma.addOn.create({
      data: {
        package_id: packageId,
        name_en: body.name_en,
        name_ar: body.name_ar,
        price: body.price,
      },
    })
    return reply.status(201).send(addOn)
  })

  // DELETE /company/packages/:id/add-ons/:addOnId — soft delete add-on
  fastify.delete('/:id/add-ons/:addOnId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const { id: packageId, addOnId } = request.params as { id: string; addOnId: string }

    // Verify package ownership before touching add-on
    const pkg = await prisma.package.findFirst({
      where: { id: packageId, company_id: companyId },
    })
    if (!pkg) return reply.status(404).send({ error: 'Package not found' })

    const addOn = await prisma.addOn.findFirst({
      where: { id: addOnId, package_id: packageId },
    })
    if (!addOn) return reply.status(404).send({ error: 'Add-on not found' })

    await prisma.addOn.update({
      where: { id: addOnId },
      data: { is_active: false },
    })
    return { success: true }
  })
}
