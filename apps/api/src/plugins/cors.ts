import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { env } from '../lib/env.js'

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: [
      env.CUSTOMER_WEB_URL,
      env.COMPANY_WEB_URL,
      env.ADMIN_WEB_URL,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
})
