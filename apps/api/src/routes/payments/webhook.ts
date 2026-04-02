import type { FastifyInstance } from 'fastify'
import { stripe } from '../../services/stripe.service.js'
import { prisma } from '../../lib/prisma.js'
import type Stripe from 'stripe'

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
  // POST /webhooks/stripe — Stripe webhook handler
  // CRITICAL: rawBody must be enabled on this route (registered in Plan 02 via fastify-raw-body)
  fastify.post('/', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string

    if (!sig) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        (request as any).rawBody!, // Raw bytes — NOT request.body (Pitfall 4)
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      )
    } catch (err: any) {
      fastify.log.error(`Webhook signature verification failed: ${err.message}`)
      return reply.status(400).send({ error: 'Webhook signature verification failed' })
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: 'paid' },
          })
          fastify.log.info(`Order ${orderId} payment confirmed`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: 'failed' },
          })
          fastify.log.warn(`Order ${orderId} payment failed`)
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const pi = await stripe.paymentIntents.retrieve(dispute.payment_intent as string)
        const orderId = pi.metadata.order_id
        if (orderId) {
          // Flag order — pause any pending payout
          await prisma.order.update({
            where: { id: orderId },
            data: { payment_status: 'disputed' },
          })
          fastify.log.warn(`Order ${orderId} disputed — payout paused`)
        }
        break
      }

      case 'account.updated': {
        // Stripe Connect account status update (COMP-07)
        const account = event.data.object as Stripe.Account
        fastify.log.info(`Connect account ${account.id} updated: charges_enabled=${account.charges_enabled}`)
        // Could update company record with activation status
        break
      }

      default:
        fastify.log.info(`Unhandled webhook event: ${event.type}`)
    }

    return reply.status(200).send({ received: true })
  })
}
