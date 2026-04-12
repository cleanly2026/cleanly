import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createTokenPair } from '../../services/auth.service.js'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../lib/env.js'
import crypto from 'node:crypto'

// Shared secret between admin-web and Fastify API.
// admin-web signs: HMAC-SHA256(email, ADMIN_EXCHANGE_SECRET)
// Fastify verifies the signature before issuing a JWT.
// Secret is resolved lazily inside the handler — missing env does NOT crash server at import.

function verifyExchangeSignature(email: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(email)
    .digest('hex')
  // Both buffers must be same length for timingSafeEqual
  const sigBuffer = Buffer.from(signature.padEnd(64, '0').slice(0, 64))
  const expBuffer = Buffer.from(expected)
  return crypto.timingSafeEqual(sigBuffer, expBuffer)
}

const ExchangeRequestSchema = z.object({
  email: z.string().email().endsWith('@cleanly.ae'),
  signature: z.string().length(64),  // HMAC-SHA256 hex = 64 chars
})

export async function adminRoutes(fastify: FastifyInstance) {
  // POST /auth/admin/exchange — converts Auth.js session to Fastify JWT
  fastify.post('/exchange', {
    schema: { body: ExchangeRequestSchema },
    handler: async (request, reply) => {
      // Lazy env check: return 503 if secret is not configured rather than crashing at import
      const secret = env.ADMIN_EXCHANGE_SECRET
      if (!secret) {
        fastify.log.warn('[admin] ADMIN_EXCHANGE_SECRET not set — admin exchange disabled')
        return reply.status(503).send({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Admin exchange not configured',
        })
      }

      const { email, signature } = request.body as z.infer<typeof ExchangeRequestSchema>

      if (!verifyExchangeSignature(email, signature, secret)) {
        return reply.status(401).send({
          statusCode: 401, error: 'Unauthorized', message: 'Invalid exchange signature',
        })
      }

      // Find or create admin user
      const admin = await prisma.user.upsert({
        where: { email },
        update: { updated_at: new Date() },
        create: { email, role: 'admin' },
      })

      const tokens = await createTokenPair(fastify, admin.id, 'admin')
      return reply.status(200).send(tokens)
    },
  })
}
