import fp from 'fastify-plugin'
import type { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (fastify) => {
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request.user as { role?: string }).role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
  })
})
