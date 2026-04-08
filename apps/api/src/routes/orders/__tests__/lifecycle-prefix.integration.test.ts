import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

// Mock prisma before importing route
vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    order: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'test-order-id',
        status: 'washer_en_route',
        type: 'onsite',
        company_id: 'test-company',
        customer_id: 'test-customer',
        washer_id: 'test-washer',
        amount_total: 10000,
        amount_subtotal: 8500,
        platform_fee: 1500,
        location_note: null,
      }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'test-order-id',
        status: 'in_progress',
        type: 'onsite',
        company_id: 'test-company',
        customer_id: 'test-customer',
        washer_id: 'test-washer',
        amount_total: 10000,
        amount_subtotal: 8500,
        platform_fee: 1500,
        location_note: null,
      }),
      update: vi.fn().mockResolvedValue({ id: 'test-order-id', status: 'in_progress' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ lat: 0, lng: 0 }]),
  },
}))

vi.mock('../../../lib/socket.js', () => ({
  getIO: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
  setupSocketHandlers: vi.fn(),
}))

vi.mock('../../../lib/queue.js', () => ({
  orderQueue: { add: vi.fn() },
}))

vi.mock('../../../queues/queues.js', () => ({
  notificationQueue: { add: vi.fn() },
}))

// Mock order.service.js transitionOrderStatus to avoid DB transaction complexity
vi.mock('../../../services/order.service.js', () => ({
  transitionOrderStatus: vi.fn().mockResolvedValue(undefined),
}))

const { orderLifecycleRoutes } = await import('../lifecycle.js')
const { buildTestApp } = await import('../../../test-helpers/build-app.js')

describe('Order lifecycle route prefix (D-04 test 1)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp([
      { plugin: orderLifecycleRoutes, prefix: '/api/orders' },
    ])
  })

  afterAll(async () => {
    await app.close()
  })

  it('PATCH /api/orders/:id/status returns 200, not 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/orders/test-order-id/status',
      headers: {
        'content-type': 'application/json',
        'x-test-user': JSON.stringify({
          sub: 'test-washer',
          role: 'washer',
          companyId: 'test-company',
        }),
      },
      payload: { status: 'in_progress' },
    })

    // Route resolves (not 404) — confirms /api prefix is registered
    expect(res.statusCode).not.toBe(404)
    // Should be 200 with mocked dependencies
    expect(res.statusCode).toBe(200)
  })

  it('PATCH /orders/:id/status WITHOUT /api prefix returns 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/orders/test-order-id/status',
      headers: { 'content-type': 'application/json' },
      payload: { status: 'in_progress' },
    })

    // Old path (without /api) must not resolve
    expect(res.statusCode).toBe(404)
  })
})
