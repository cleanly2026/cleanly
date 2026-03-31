import { z } from 'zod'

// Standard API error response shape
export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>

// Pagination
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})
export type Pagination = z.infer<typeof PaginationSchema>

// Language preference
export const LanguageSchema = z.enum(['en', 'ar'])
export type Language = z.infer<typeof LanguageSchema>
