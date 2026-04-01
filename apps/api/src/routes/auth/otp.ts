import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { SendOtpRequestSchema, VerifyOtpRequestSchema, RefreshTokenSchema } from '@cleanly/types'
import { sendOtp, verifyOtp } from '../../services/otp.service.js'
import { createTokenPair, rotateRefreshToken } from '../../services/auth.service.js'
import { prisma } from '../../lib/prisma.js'

export async function otpRoutes(fastify: FastifyInstance) {
  // POST /auth/otp/send — AUTH-01, AUTH-07 (rate limited: 3/phone/15min)
  fastify.post('/send', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
        keyGenerator: (req) => (req.body as any).phone ?? req.ip,
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Maximum 3 OTP requests per 15 minutes',
        }),
      },
    },
    schema: {
      body: SendOtpRequestSchema,
      response: {
        200: z.object({ success: z.boolean() }),
        429: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { phone } = request.body as z.infer<typeof SendOtpRequestSchema>
      const result = await sendOtp(phone)
      if (!result.success) {
        return reply.status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'OTP service unavailable' })
      }
      return { success: true }
    },
  })

  // POST /auth/otp/verify — AUTH-01: verify code + create/find user + issue tokens
  fastify.post('/verify', {
    schema: { body: VerifyOtpRequestSchema },
    handler: async (request, reply) => {
      const { phone, code } = request.body as z.infer<typeof VerifyOtpRequestSchema>

      const result = await verifyOtp(phone, code)
      if (!result.valid) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or expired OTP code',
        })
      }

      // Upsert customer user
      const user = await prisma.user.upsert({
        where: { phone },
        update: { updated_at: new Date() },
        create: { phone, role: 'customer' },
      })

      const tokens = await createTokenPair(fastify, user.id, 'customer')
      return reply.status(200).send(tokens)
    },
  })

  // POST /auth/refresh — AUTH-02: refresh token rotation
  fastify.post('/refresh', {
    schema: { body: RefreshTokenSchema },
    handler: async (request, reply) => {
      const { refreshToken } = request.body as z.infer<typeof RefreshTokenSchema>

      // We need the userId to look up the token — decode from access token header
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'No authorization header' })
      }

      let payload: { sub: string; role: 'customer' | 'washer' | 'company_member' | 'admin' }
      try {
        payload = fastify.jwt.decode(authHeader.replace('Bearer ', '')) as any
      } catch {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token' })
      }

      const tokens = await rotateRefreshToken(fastify, payload.sub, payload.role, refreshToken)
      if (!tokens) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Refresh token expired or revoked' })
      }

      return reply.status(200).send(tokens)
    },
  })
}
