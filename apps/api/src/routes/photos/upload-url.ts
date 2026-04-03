import { FastifyInstance } from 'fastify'
import { getSignedUploadUrl, buildPhotoKey } from '../../lib/r2.js'

export default async function photoUploadUrlRoutes(fastify: FastifyInstance) {
  // GET /api/photos/upload-url?orderId=xxx&photoType=before — PHO-05
  fastify.get('/upload-url', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['orderId', 'photoType'],
        properties: {
          orderId: { type: 'string' },
          photoType: { type: 'string', enum: ['before', 'after', 'pickup', 'return'] },
        },
      },
    },
  }, async (request, reply) => {
    const { orderId, photoType } = request.query as { orderId: string; photoType: 'before' | 'after' | 'pickup' | 'return' }

    const key = buildPhotoKey(orderId, photoType, 'jpg')
    const uploadUrl = await getSignedUploadUrl(key, 'image/jpeg')

    return { uploadUrl, key }
  })
}
