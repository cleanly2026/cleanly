import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'

const mockFindMany = vi.fn()
const mockCount = vi.fn()

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    order: {
      findMany: (...args: any[]) => mockFindMany(...args),
      count: (...args: any[]) => mockCount(...args),
    },
  },
}))

const { companyOrdersRoute } = await import('../orders.js')
const { buildTestApp } = await import('../../../test-helpers/build-app.js')

describe('Company orders scoping (D-04 test 3)', () => {
  let app: FastifyInstance
  const COMPANY_A = 'company-aaa'
  const COMPANY_B = 'company-bbb'

  beforeAll(async () => {
    app = await buildTestApp([
      { plugin: companyOrdersRoute, prefix: '/api/company/orders' },
    ])
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/company/orders returns only orders for authenticated company', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'order-1', company_id: COMPANY_A, status: 'pending', amount_total: 5000, created_at: new Date(), customer: { id: 'cust-1', phone: '+971501234567' }, items: [], washer: null },
    ])
    mockCount.mockResolvedValue(1)

    const res = await app.inject({
      method: 'GET',
      url: '/api/company/orders',
      headers: {
        'x-test-user': JSON.stringify({
          sub: 'user-1',
          role: 'company_member',
          companyId: COMPANY_A,
        }),
      },
    })

    expect(res.statusCode).toBe(200)

    // Verify prisma was called with the correct company_id filter (COMP-05 scoping)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company_id: COMPANY_A,
        }),
      })
    )

    // Verify it was NOT called with COMPANY_B
    const callArgs = mockFindMany.mock.calls[0][0]
    expect(callArgs.where.company_id).toBe(COMPANY_A)
    expect(callArgs.where.company_id).not.toBe(COMPANY_B)
  })

  it('GET /api/company/orders returns 403 if user has no companyId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/company/orders',
      headers: {
        'x-test-user': JSON.stringify({
          sub: 'user-1',
          role: 'washer',
          // no companyId — simulate non-company user
        }),
      },
    })

    expect(res.statusCode).toBe(403)
  })
})
