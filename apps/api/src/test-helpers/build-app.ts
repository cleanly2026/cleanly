import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

/**
 * Build a minimal Fastify instance for integration testing.
 * Registers specified route plugins under their given prefixes.
 * Auth is mocked via a decorator that reads x-test-user header and sets request.user.
 *
 * Uses a passthrough validator to avoid Zod v3/v4 compatibility issues with
 * fastify-type-provider-zod@6 in the test environment.
 * Route schema validation is not the concern of these integration tests — routing is.
 */
export async function buildTestApp(
  routes: Array<{ plugin: (f: FastifyInstance) => Promise<void>; prefix: string }>
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // Passthrough validator: skip Zod schema validation in test context.
  // These integration tests verify routing and auth scoping, not schema shape.
  // Use (data) => ({ value: data }) to preserve the parsed body for handler access.
  app.setValidatorCompiler(() => (data) => ({ value: data }))
  app.setSerializerCompiler(() => (data) => JSON.stringify(data))

  // Mock auth: read x-test-user header and parse as JSON into request.user
  app.decorateRequest('user', null)
  app.addHook('preHandler', async (request) => {
    const header = request.headers['x-test-user']
    if (header && typeof header === 'string') {
      ;(request as any).user = JSON.parse(header)
    }
  })

  // Mock authenticate decorator to match what route plugins expect
  app.decorate('authenticate', async () => {})

  for (const { plugin, prefix } of routes) {
    await app.register(plugin, { prefix })
  }

  await app.ready()
  return app
}
