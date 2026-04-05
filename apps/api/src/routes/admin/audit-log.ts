import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export default async function adminAuditLogRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.requireAdmin)

  // GET / -- audit log with filters (ADM-06, D-09)
  // Query: ?action=company.verify, ?admin_id=xxx, ?page=1, ?limit=20
  fastify.get('/', async (request) => {
    const { action, admin_id, page = '1', limit = '20' } = request.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (admin_id) where.admin_id = admin_id
    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ])
    return { entries, total, page: parseInt(page), limit: parseInt(limit) }
  })
}
