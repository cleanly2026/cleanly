import fp from 'fastify-plugin'
import cors from '@fastify/cors'

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: [
      process.env.CUSTOMER_WEB_URL ?? 'http://localhost:3001',
      process.env.COMPANY_WEB_URL  ?? 'http://localhost:3002',
      process.env.ADMIN_WEB_URL    ?? 'http://localhost:3003',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
})
