import type { FastifyInstance } from 'fastify'
import { createOnSiteOrderSchema, createCarpetOrderSchema } from '@cleanly/types'
import { prisma } from '../../lib/prisma.js'
import { computeOrderTotal, computeCarpetReturnDate } from '../../services/order.service.js'
import { createPaymentIntent } from '../../services/stripe.service.js'
import { getIO } from '../../lib/socket.js'

export async function bookingRoutes(fastify: FastifyInstance) {

  // POST /orders/on-site — on-site booking (BOOK-01 to BOOK-04)
  fastify.post('/on-site', {
    preHandler: [fastify.authenticate],
    schema: { body: createOnSiteOrderSchema },
  }, async (request, reply) => {
    const body = request.body as any
    const customerId = (request.user as any).sub

    // 1. Compute prices server-side (Pitfall 3 prevention)
    const pricing = await computeOrderTotal({
      packageId: body.package_id,
      quantity: body.quantity,
      addOnIds: body.add_on_ids,
    })

    if (!pricing.stripeAccountId) {
      return reply.status(400).send({ error: 'Company has not completed Stripe Connect onboarding' })
    }

    // 2. Create order with PostGIS geography point for service_location
    const order = await prisma.$transaction(async (tx: any) => {
      const ord = await tx.order.create({
        data: {
          type: 'on_site',
          customer_id: customerId,
          company_id: pricing.companyId,
          amount_subtotal: pricing.amountSubtotal,
          platform_fee: pricing.platformFee,
          amount_total: pricing.amountTotal,
          location_note: body.location_note ?? null,
          items: {
            create: [{
              package_id: body.package_id,
              quantity: body.quantity,
              unit_price: pricing.packagePrice,
            }],
          },
        },
      })

      // Set service_location as PostGIS geography point via raw SQL
      await tx.$executeRaw`
        UPDATE "Order"
        SET service_location = ST_SetSRID(ST_MakePoint(${body.service_location.lng}, ${body.service_location.lat}), 4326)::geography
        WHERE id = ${ord.id}
      `

      return ord
    })

    // 3. Create Stripe PaymentIntent with destination charge
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amountTotal: pricing.amountTotal,
      platformFee: pricing.platformFee,
      stripeAccountId: pricing.stripeAccountId,
      orderId: order.id,
      companyId: pricing.companyId,
    })

    // 4. Store payment_intent_id on order
    await prisma.order.update({
      where: { id: order.id },
      data: { payment_intent_id: paymentIntentId },
    })

    // 5. Emit to company room for real-time order notification (ORD-02)
    const io = getIO()
    io.to(`company:${pricing.companyId}`).emit('order:new', {
      orderId: order.id,
      status: 'pending',
      type: 'on_site',
      amountTotal: pricing.amountTotal,
    })

    return { order_id: order.id, client_secret: clientSecret }
  })

  // POST /orders/carpet — carpet booking (CARP-01 to CARP-03)
  fastify.post('/carpet', {
    preHandler: [fastify.authenticate],
    schema: { body: createCarpetOrderSchema },
  }, async (request, reply) => {
    const body = request.body as any
    const customerId = (request.user as any).sub

    const pricing = await computeOrderTotal({
      packageId: body.package_id,
      quantity: body.quantity,
      addOnIds: body.add_on_ids,
    })

    if (!pricing.stripeAccountId) {
      return reply.status(400).send({ error: 'Company has not completed Stripe Connect onboarding' })
    }

    const pickupTime = new Date(body.pickup_time)
    const returnDate = await computeCarpetReturnDate(pricing.companyId, pickupTime)

    const order = await prisma.$transaction(async (tx: any) => {
      const ord = await tx.order.create({
        data: {
          type: 'carpet',
          customer_id: customerId,
          company_id: pricing.companyId,
          amount_subtotal: pricing.amountSubtotal,
          platform_fee: pricing.platformFee,
          amount_total: pricing.amountTotal,
          location_note: body.location_note ?? null,
          items: {
            create: [{
              package_id: body.package_id,
              quantity: body.quantity,
              unit_price: pricing.packagePrice,
            }],
          },
          carpet_details: {
            create: {
              pickup_time: pickupTime,
              return_date: returnDate,
              carpet_count: body.quantity,
            },
          },
        },
      })

      // Set service_location for carpet pickup address
      await tx.$executeRaw`
        UPDATE "Order"
        SET service_location = ST_SetSRID(ST_MakePoint(${body.service_location.lng}, ${body.service_location.lat}), 4326)::geography
        WHERE id = ${ord.id}
      `

      return ord
    })

    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amountTotal: pricing.amountTotal,
      platformFee: pricing.platformFee,
      stripeAccountId: pricing.stripeAccountId,
      orderId: order.id,
      companyId: pricing.companyId,
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { payment_intent_id: paymentIntentId },
    })

    const io = getIO()
    io.to(`company:${pricing.companyId}`).emit('order:new', {
      orderId: order.id,
      status: 'pending',
      type: 'carpet',
      amountTotal: pricing.amountTotal,
    })

    return { order_id: order.id, client_secret: clientSecret }
  })
}
