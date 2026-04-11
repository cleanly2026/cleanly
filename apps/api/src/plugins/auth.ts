import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { JWTPayload } from '@cleanly/types'
import type { FastifyRequest, FastifyReply } from 'fastify'

// Extend Fastify types so request.user is typed as JWTPayload
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '15m' },
  })

  // Decorator: use as preHandler to protect routes
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.send(err)
      }
    }
  )
})
