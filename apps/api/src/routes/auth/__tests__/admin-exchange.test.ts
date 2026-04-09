import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock prisma before importing any modules that depend on it
const mockUpsert = vi.fn()
vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: any[]) => mockUpsert(...args),
    },
  },
}))

// Mock auth service before importing admin routes
vi.mock('../../../services/auth.service.js', () => ({
  createTokenPair: vi.fn().mockResolvedValue({
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  }),
}))

const { adminRoutes } = await import('../admin.js')
const { buildTestApp } = await import('../../../test-helpers/build-app.js')

describe('POST /api/auth/admin/exchange', () => {
  let savedSecret: string | undefined

  beforeEach(() => {
    savedSecret = process.env.ADMIN_EXCHANGE_SECRET
  })

  afterEach(() => {
    if (savedSecret === undefined) {
      delete process.env.ADMIN_EXCHANGE_SECRET
    } else {
      process.env.ADMIN_EXCHANGE_SECRET = savedSecret
    }
  })

  it('returns 503 when ADMIN_EXCHANGE_SECRET is not set', async () => {
    delete process.env.ADMIN_EXCHANGE_SECRET

    const app = await buildTestApp([
      { plugin: adminRoutes, prefix: '/api/auth/admin' },
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/admin/exchange',
      payload: { email: 'test@cleanly.ae', signature: 'a'.repeat(64) },
    })

    expect(response.statusCode).toBe(503)
    const body = JSON.parse(response.body)
    expect(body.message).toBe('Admin exchange not configured')

    await app.close()
  })

  it('returns 401 when ADMIN_EXCHANGE_SECRET is set but signature is wrong', async () => {
    process.env.ADMIN_EXCHANGE_SECRET = 'test-secret'

    const app = await buildTestApp([
      { plugin: adminRoutes, prefix: '/api/auth/admin' },
    ])

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/admin/exchange',
      payload: { email: 'test@cleanly.ae', signature: 'b'.repeat(64) },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.message).toBe('Invalid exchange signature')

    await app.close()
  })
})
