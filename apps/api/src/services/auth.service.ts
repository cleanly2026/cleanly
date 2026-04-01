import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { redis } from '../lib/redis.js'
import type { JWTPayload, TokenPair } from '@cleanly/types'

const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30  // 30 days in seconds

// Generates opaque refresh token, hashes it, stores in Redis
export async function createTokenPair(
  fastify: FastifyInstance,
  userId: string,
  role: JWTPayload['role'],
  companyId?: string
): Promise<TokenPair> {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    role,
    ...(companyId ? { companyId } : {}),
  }

  const accessToken = await fastify.jwt.sign(payload)

  // Opaque refresh token: 32 random bytes as hex
  const refreshToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(refreshToken, 10)

  // Store hash in Redis keyed by userId — allows invalidation on password change
  await redis.set(`rt:${userId}`, tokenHash, 'EX', REFRESH_TOKEN_TTL)

  return { accessToken, refreshToken }
}

export async function rotateRefreshToken(
  fastify: FastifyInstance,
  userId: string,
  role: JWTPayload['role'],
  oldRefreshToken: string,
  companyId?: string
): Promise<TokenPair | null> {
  const storedHash = await redis.get(`rt:${userId}`)
  if (!storedHash) return null  // Token revoked or expired

  const isValid = await bcrypt.compare(oldRefreshToken, storedHash)
  if (!isValid) return null

  // Delete old token before issuing new pair (rotation)
  await redis.del(`rt:${userId}`)

  return createTokenPair(fastify, userId, role, companyId)
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  await redis.del(`rt:${userId}`)
}
