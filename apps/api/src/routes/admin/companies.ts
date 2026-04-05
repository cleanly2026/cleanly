import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { notificationQueue } from '../../queues/queues.js'

export default async function adminCompanyRoutes(fastify: FastifyInstance) {
  // All routes require admin
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // GET / -- list companies with optional status filter (ADM-01)
  // Query params: ?status=pending|verified|all (default: all), ?page=1, ?limit=10
  fastify.get('/', async (request) => {
    const { status = 'all', page = '1', limit = '10' } = request.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = status === 'all' ? {} : { is_verified: status === 'verified' }
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: { city: { select: { name_en: true, name_ar: true } }, services: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.company.count({ where }),
    ])
    return { companies, total, page: parseInt(page), limit: parseInt(limit) }
  })

  // GET /:id -- company detail (ADM-01)
  fastify.get<{ Params: { id: string } }>('/:id', async (request) => {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: request.params.id },
      include: {
        city: true,
        services: true,
        packages: { where: { is_active: true } },
        members: { select: { id: true, email: true, role: true } },
      },
    })
    return company
  })

  // PATCH /:id/verify -- approve company (ADM-01)
  fastify.patch<{ Params: { id: string } }>('/:id/verify', async (request) => {
    const { id } = request.params
    const company = await prisma.company.update({
      where: { id },
      data: { is_verified: true },
    })
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'company.verify',
        entity: 'Company',
        entity_id: id,
        metadata: { company_name: company.name_en },
      },
    })
    return company
  })

  // PATCH /:id/reject -- reject company with reason (ADM-01, D-08)
  fastify.patch<{ Params: { id: string } }>('/:id/reject', async (request, reply) => {
    const { id } = request.params
    const { reason } = request.body as { reason: string }
    if (!reason || reason.length < 5) {
      return reply.status(400).send({ error: 'Rejection reason is required (min 5 characters)' })
    }
    const company = await prisma.company.update({
      where: { id },
      data: { is_verified: false },
    })
    await prisma.auditLog.create({
      data: {
        admin_id: (request.user as { sub: string }).sub,
        action: 'company.reject',
        entity: 'Company',
        entity_id: id,
        metadata: { reason, company_name: company.name_en },
      },
    })

    // D-08: Send rejection notification to company admin user
    // Find the company's admin member to notify them of the rejection
    const companyAdmin = await prisma.user.findFirst({
      where: { company_id: id, role: 'company_member' },
      select: { id: true, expo_push_token: true, email: true, preferred_language: true },
    })
    if (companyAdmin) {
      const lang = (companyAdmin.preferred_language as 'en' | 'ar') ?? 'en'
      // Push notification to company admin if they have a push token
      if (companyAdmin.expo_push_token) {
        await notificationQueue.add('send-push', {
          pushToken: companyAdmin.expo_push_token,
          event: 'company_rejected',
          orderId: '',
          language: lang,
          data: { reason, companyName: company.name_en },
        })
      }
      // Email notification to company admin (per D-08: rejection reason sent via notification)
      if (companyAdmin.email) {
        await notificationQueue.add('send-company-rejection-email', {
          email: companyAdmin.email,
          companyName: company.name_en,
          reason,
          language: lang,
        })
      }
    }

    return { ...company, rejection_reason: reason }
  })
}
