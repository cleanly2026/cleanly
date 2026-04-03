import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import { initSentry } from './lib/sentry.js'
import authPlugin from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import zodPlugin from './plugins/zod-provider.js'
import { otpRoutes } from './routes/auth/otp.js'
import { washerRoutes } from './routes/auth/washer.js'
import { companyRoutes } from './routes/auth/company.js'
import { adminRoutes } from './routes/auth/admin.js'
import { companyOrdersRoute } from './routes/company/orders.js'
import { companyProfileRoutes } from './routes/company/profile.js'
import { companyServicesRoutes } from './routes/company/services.js'
import { stripeConnectRoutes } from './routes/company/stripe-connect.js'
import { companyPackageRoutes } from './routes/company/packages.js'
import { companyWasherRoutes } from './routes/company/washers.js'
import { bookingRoutes } from './routes/booking/orders.js'
import { orderLifecycleRoutes } from './routes/orders/lifecycle.js'
import { customerOrderRoutes } from './routes/orders/customer-orders.js'
import { cityRoutes } from './routes/discovery/cities.js'
import { discoveryRoutes } from './routes/discovery/companies.js'
import { setupSocketHandlers } from './lib/socket.js'
import { stripeWebhookRoutes } from './routes/payments/webhook.js'

// Initialize Sentry before anything else
initSentry()

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

// Register plugins
await server.register(corsPlugin)
await server.register(rateLimitPlugin)
await server.register(authPlugin)
await server.register(zodPlugin)
// rawBody needed by Stripe webhook route (Plan 08) — global: false means opt-in per route
await server.register(rawBody, { field: 'rawBody', global: false, runFirst: true })

// Health check (no auth required)
server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}))

// Auth routes — Plan 06: phone OTP (customers) and OTP+PIN (washers)
await server.register(otpRoutes, { prefix: '/auth/otp' })
await server.register(washerRoutes, { prefix: '/auth/washer' })
// Auth routes — Plan 07: company admin email+TOTP MFA and platform admin Google SSO exchange
await server.register(companyRoutes, { prefix: '/auth/company' })
await server.register(adminRoutes, { prefix: '/auth/admin' })

// Company routes — Plan 09: company dashboard order feed (COMP-05, COMP-06)
await server.register(companyOrdersRoute, { prefix: '/company/orders' })

// Company management routes — Plan 05: profile, services, packages, washers, Stripe Connect
await server.register(companyProfileRoutes, { prefix: '/company/profile' })
await server.register(companyServicesRoutes, { prefix: '/company/services' })
await server.register(stripeConnectRoutes, { prefix: '/company/stripe-connect' })
await server.register(companyPackageRoutes, { prefix: '/company/packages' })
await server.register(companyWasherRoutes, { prefix: '/company/washers' })

// Discovery routes — Plan 03: company listing + profiles (DISC-01 through DISC-05)
await server.register(cityRoutes, { prefix: '/cities' })
await server.register(discoveryRoutes, { prefix: '/companies' })

// Booking routes — Plan 04: order creation for on-site and carpet bookings (BOOK-01 through BOOK-04, CARP-01 through CARP-03)
await server.register(bookingRoutes, { prefix: '/orders' })

// Order lifecycle routes — Plan 07: state transitions, washer assignment, cancellation (ORD-01 through ORD-06, CARP-05)
await server.register(orderLifecycleRoutes, { prefix: '/orders' })

// Customer order read routes — Plan 07: GET /customer/orders and /customer/orders/:id
await server.register(customerOrderRoutes, { prefix: '/customer/orders' })

// Stripe webhook — Plan 08: payment confirmation, dispute handling (PAY-05)
// IMPORTANT: Must NOT be behind fastify.authenticate — Stripe sends the webhook, not an authenticated user
await server.register(stripeWebhookRoutes, { prefix: '/webhooks/stripe' })

const port = parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await server.listen({ port, host })
  console.log(`[API] Server running on http://${host}:${port}`)
  // Attach Socket.io to the underlying HTTP server after listen
  setupSocketHandlers(server.server)
  console.log('[API] Socket.io attached')
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
