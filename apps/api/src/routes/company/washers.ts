import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { washerSchema } from '@cleanly/types'
import { prisma } from '../../lib/prisma.js'

export async function companyWasherRoutes(fastify: FastifyInstance) {
  // GET /company/washers — list all washers for this company
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const washers = await prisma.user.findMany({
      where: { company_id: companyId, role: 'washer' },
      select: {
        id: true,
        phone: true,
        created_at: true,
        washer_profile: {
          select: { is_online: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })
    return { washers }
  })

  // POST /company/washers — create a new washer account (COMP-04)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: { body: washerSchema },
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const body = request.body as any

    // Check for duplicate phone
    const existing = await prisma.user.findUnique({
      where: { phone: body.phone },
    })
    if (existing) return reply.status(409).send({ error: 'Phone number already registered' })

    // Hash default PIN "0000" using bcryptjs (per decision: bcryptjs not bare bcrypt)
    const defaultPinHash = await bcrypt.hash('0000', 10)

    const washer = await prisma.user.create({
      data: {
        role: 'washer',
        phone: body.phone,
        company_id: companyId,
        pin_hash: defaultPinHash,
        washer_profile: { create: {} },
      },
      select: { id: true, phone: true },
    })
    return reply.status(201).send(washer)
  })

  // PATCH /company/washers/:id/deactivate — remove washer from company roster
  fastify.patch('/:id/deactivate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const { id } = request.params as { id: string }

    // Verify washer belongs to this company
    const washer = await prisma.user.findFirst({
      where: { id, company_id: companyId, role: 'washer' },
    })
    if (!washer) return reply.status(404).send({ error: 'Washer not found' })

    // Set company_id to null — removes from roster without deleting user account/history
    await prisma.user.update({
      where: { id },
      data: { company_id: null },
    })
    return { success: true }
  })
}
