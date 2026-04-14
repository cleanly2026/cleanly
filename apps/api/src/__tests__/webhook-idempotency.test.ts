import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Stripe webhook verification to bypass signature checks in tests.
vi.mock('../services/stripe.service.js', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    paymentIntents: { retrieve: vi.fn() },
  },
}))

// Mock the Prisma singleton — webhook handler imports it via ../../lib/prisma.js
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    processedStripeEvent: { createMany: vi.fn() },
    order: { update: vi.fn() },
  },
}))

// Mock the env loader — avoids requiring STRIPE_WEBHOOK_SECRET in the test env.
vi.mock('../lib/env.js', () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    STRIPE_SECRET_KEY: 'sk_test',
  },
}))

import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import { stripeWebhookRoutes } from '../routes/payments/webhook.js'
import { stripe } from '../services/stripe.service.js'
import { prisma } from '../lib/prisma.js'

const FAKE_EVENT = {
  id: 'evt_test_idempotency',
  type: 'payment_intent.succeeded',
  data: { object: { metadata: { order_id: 'order_abc' } } },
}

async function buildApp() {
  const app = Fastify()
  await app.register(rawBody, { field: 'rawBody', global: false, runFirst: true })
  await app.register(stripeWebhookRoutes, { prefix: '/webhooks/stripe' })
  return app
}

describe('Stripe webhook idempotency (MON-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(stripe.webhooks.constructEvent as any).mockReturnValue(FAKE_EVENT)
  })

  it('processes a first-time event and inserts a marker row', async () => {
    ;(prisma.processedStripeEvent.createMany as any).mockResolvedValue({ count: 1 })
    ;(prisma.order.update as any).mockResolvedValue({})

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe/',
      headers: { 'stripe-signature': 'x', 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ received: true })
    expect(prisma.processedStripeEvent.createMany).toHaveBeenCalledOnce()
    expect(prisma.order.update).toHaveBeenCalledOnce()
    await app.close()
  })

  it('short-circuits a duplicate event (createMany returns count=0)', async () => {
    ;(prisma.processedStripeEvent.createMany as any).mockResolvedValue({ count: 0 })

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe/',
      headers: { 'stripe-signature': 'x', 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ received: true, duplicate: true })
    expect(prisma.processedStripeEvent.createMany).toHaveBeenCalledOnce()
    expect(prisma.order.update).not.toHaveBeenCalled()
    await app.close()
  })

  it('two identical requests only process the side-effect once', async () => {
    ;(prisma.processedStripeEvent.createMany as any)
      .mockResolvedValueOnce({ count: 1 }) // first attempt: new
      .mockResolvedValueOnce({ count: 0 }) // second attempt: duplicate
    ;(prisma.order.update as any).mockResolvedValue({})

    const app = await buildApp()
    const body = { 'stripe-signature': 'x', 'content-type': 'application/json' }
    await app.inject({ method: 'POST', url: '/webhooks/stripe/', headers: body, payload: '{}' })
    await app.inject({ method: 'POST', url: '/webhooks/stripe/', headers: body, payload: '{}' })
    expect(prisma.order.update).toHaveBeenCalledOnce()
    await app.close()
  })
})
