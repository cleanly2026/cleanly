import { neon } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

// Direct connection for Fastify (long-running — not serverless)
// Prisma manages its own connection pool. Do NOT use -pooler URL here.
const sql = neon(process.env.DATABASE_URL!)
const adapter = new PrismaNeon(sql)

export const prisma = new PrismaClient({ adapter })

// Never call new PrismaClient() outside this file.
// Import { prisma } everywhere.
