import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { getPublicUrl } from '../../lib/r2.js'
import { getIO } from '../../lib/socket.js'

export default async function orderPhotosRoutes(fastify: FastifyInstance) {
  // PATCH /api/orders/:id/photos — called after client uploads photo to R2
  fastify.patch<{ Params: { id: string } }>('/:id/photos', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['photoType', 'r2Key'],
        properties: {
          photoType: { type: 'string', enum: ['before', 'after', 'pickup', 'return'] },
          r2Key: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id: orderId } = request.params
    const { photoType, r2Key } = request.body as { photoType: 'before' | 'after' | 'pickup' | 'return'; r2Key: string }

    const photoUrl = getPublicUrl(r2Key)

    if (photoType === 'before') {
      await prisma.order.update({ where: { id: orderId }, data: { before_photo_url: photoUrl } })
    } else if (photoType === 'after') {
      await prisma.order.update({ where: { id: orderId }, data: { after_photo_url: photoUrl } })
    } else if (photoType === 'pickup') {
      await prisma.carpetOrderDetails.update({ where: { order_id: orderId }, data: { pickup_photo_url: photoUrl } })
    } else if (photoType === 'return') {
      await prisma.carpetOrderDetails.update({ where: { order_id: orderId }, data: { return_photo_url: photoUrl } })
    }

    // Notify customer + company via Socket.io order room
    getIO().to(`order:${orderId}`).emit('order:photo-uploaded', { photoType, photoUrl })

    return { photoType, photoUrl }
  })
}
