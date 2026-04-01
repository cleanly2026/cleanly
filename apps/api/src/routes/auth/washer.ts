import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { WasherPinVerifySchema } from '@cleanly/types'
import { verifyOtp } from '../../services/otp.service.js'
import { createTokenPair } from '../../services/auth.service.js'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'

export async function washerRoutes(fastify: FastifyInstance) {
  // POST /auth/washer/verify — AUTH-05: OTP + PIN verification
  fastify.post('/verify', {
    schema: { body: WasherPinVerifySchema },
    handler: async (request, reply) => {
      const { phone, code, pin } = request.body as z.infer<typeof WasherPinVerifySchema>

      // Step 1: Verify OTP
      const otpResult = await verifyOtp(phone, code)
      if (!otpResult.valid) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or expired OTP code',
        })
      }

      // Step 2: Find washer and verify PIN
      // findFirst used because phone is unique but role is not part of the unique constraint
      const washer = await prisma.user.findFirst({
        where: { phone, role: 'washer' },
        select: { id: true, pin_hash: true },
      })

      if (!washer || !washer.pin_hash) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Washer account not found',
        })
      }

      const pinValid = await bcrypt.compare(pin, washer.pin_hash)
      if (!pinValid) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid PIN',
        })
      }

      const tokens = await createTokenPair(fastify, washer.id, 'washer')
      return reply.status(200).send(tokens)
    },
  })
}
