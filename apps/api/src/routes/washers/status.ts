import { FastifyInstance } from 'fastify'
import type { JWTPayload } from '@cleanly/types'
import { prisma } from '../../lib/prisma.js'

export default async function washerStatusRoutes(fastify: FastifyInstance) {
  // PATCH /api/washers/status — WASH-01: toggle online/offline
  fastify.patch('/status', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['online'],
        properties: { online: { type: 'boolean' } },
      },
    },
  }, async (request, reply) => {
    const { online } = request.body as { online: boolean }
    const userId = (request.user as JWTPayload).sub

    // Use upsert — WasherProfile row may not exist yet (open question 4 from research)
    await prisma.washerProfile.upsert({
      where: { user_id: userId },
      create: { user_id: userId, is_online: online },
      update: { is_online: online },
    })

    return { online }
  })
}
