import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

// Direct connection for Fastify (long-running — not serverless)
// Prisma manages its own connection pool. Do NOT use -pooler URL here.
// In @prisma/adapter-neon v7, PrismaNeon accepts a PoolConfig with connectionString,
// not the result of neon().
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })

// Never call new PrismaClient() outside this file.
// Import { prisma } everywhere.
