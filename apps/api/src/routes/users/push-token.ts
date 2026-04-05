import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export default async function pushTokenRoutes(fastify: FastifyInstance) {
  // PATCH /users/push-token -- register/update Expo push token (NOTF-01)
  fastify.patch('/push-token', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub
    const { token } = request.body as { token?: string }

    if (!token || typeof token !== 'string') {
      return reply.status(400).send({ error: 'token is required' })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { expo_push_token: token },
    })

    return { success: true }
  })
}
