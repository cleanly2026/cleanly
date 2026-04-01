import { z } from 'zod'

export const PhotoUploadRequestSchema = z.object({
  orderId: z.string().cuid(),
  photoType: z.enum(['before', 'after', 'pickup', 'return']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})
export type PhotoUploadRequest = z.infer<typeof PhotoUploadRequestSchema>

export const PhotoUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number(),  // seconds
})
export type PhotoUploadResponse = z.infer<typeof PhotoUploadResponseSchema>
