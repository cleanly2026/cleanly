import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { CompanyLoginSchema, CompanyTotpVerifySchema } from '@cleanly/types'
import { verifyTotpToken } from '../../services/totp.service.js'
import { createTokenPair } from '../../services/auth.service.js'
import { redis } from '../../lib/redis.js'
import { prisma } from '../../lib/prisma.js'

// Pre-MFA session TTL: 5 minutes (user must complete TOTP within this window)
const PRE_MFA_TTL = 5 * 60

export async function companyRoutes(fastify: FastifyInstance) {
  // POST /auth/company/login — Step 1: email + password
  // Returns pre-MFA session token if TOTP is enabled, or full tokens if not
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
        keyGenerator: (req) => (req.body as any).email ?? req.ip,
      },
    },
    schema: { body: CompanyLoginSchema },
    handler: async (request, reply) => {
      const { email, password } = request.body as z.infer<typeof CompanyLoginSchema>

      const user = await prisma.user.findFirst({
        where: { email, role: 'company_member' },
        select: { id: true, password_hash: true, totp_enabled: true, totp_secret: true, company_id: true },
      })

      // Timing-safe: always run bcrypt compare even if user not found to prevent timing attacks
      const fakeHash = '$2b$10$invalidhashfortimingatttackprevention1234567890abc'
      const hash = user?.password_hash ?? fakeHash
      const passwordValid = await bcrypt.compare(password, hash)

      if (!user || !passwordValid) {
        // AUTH-03: Never reveal which field was wrong
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Incorrect email or password.',
        })
      }

      // If TOTP is not yet enabled, issue tokens directly
      if (!user.totp_enabled) {
        const tokens = await createTokenPair(fastify, user.id, 'company_member', user.company_id ?? undefined)
        return reply.status(200).send(tokens)
      }

      // TOTP enabled — issue pre-MFA session token
      const sessionToken = crypto.randomBytes(16).toString('hex')
      await redis.set(`pre_mfa:${sessionToken}`, user.id, 'EX', PRE_MFA_TTL)

      return reply.status(200).send({
        requiresMfa: true,
        sessionToken,
      })
    },
  })

  // POST /auth/company/mfa — Step 2: TOTP verification
  fastify.post('/mfa', {
    schema: { body: CompanyTotpVerifySchema },
    handler: async (request, reply) => {
      const { token, sessionToken } = request.body as z.infer<typeof CompanyTotpVerifySchema>

      // Verify pre-MFA session exists in Redis
      const userId = await redis.get(`pre_mfa:${sessionToken}`)
      if (!userId) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'MFA session expired. Please sign in again.',
        })
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, totp_secret: true, company_id: true },
      })

      if (!user?.totp_secret) {
        return reply.status(401).send({
          statusCode: 401, error: 'Unauthorized', message: 'TOTP not configured.',
        })
      }

      const isValid = verifyTotpToken(token, user.totp_secret)
      if (!isValid) {
        return reply.status(401).send({
          statusCode: 401, error: 'Unauthorized', message: 'Incorrect code. Try again.',
        })
      }

      // Consume the pre-MFA token (single use)
      await redis.del(`pre_mfa:${sessionToken}`)

      const tokens = await createTokenPair(fastify, user.id, 'company_member', user.company_id ?? undefined)
      return reply.status(200).send(tokens)
    },
  })
}
