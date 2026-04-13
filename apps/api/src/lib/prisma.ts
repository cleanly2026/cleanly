import { PrismaClient } from '@prisma/client'

// Standard Prisma TCP connection — uses DATABASE_URL from schema.prisma datasource.
// The Neon serverless adapter (PrismaNeon) uses WebSockets which requires Node.js 21+
// or a polyfill. For long-running Fly.io servers, standard TCP via PgBouncer pooler
// is simpler and more reliable. DATABASE_URL should be the -pooler URL;
// DIRECT_URL (non-pooler) is used by Prisma Migrate only.
export const prisma = new PrismaClient()

// Never call new PrismaClient() outside this file.
// Import { prisma } everywhere.
