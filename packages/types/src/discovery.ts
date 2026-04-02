import { z } from 'zod'

// GET /companies query params
export const companyListQuerySchema = z.object({
  city_id: z.string().min(1),
  category: z.enum(['car_wash', 'carpet', 'sofa']),
  page: z.coerce.number().int().positive().default(1),
})
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>

// GET /cities response item
export const citySchema = z.object({
  id: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  country: z.string(),
})
export type City = z.infer<typeof citySchema>

// Company listing card data (DISC-04)
export const companyListItemSchema = z.object({
  id: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  slug: z.string(),
  logo_url: z.string().nullable(),
  avg_rating: z.number(),
  review_count: z.number(),
  starting_price: z.number().int(), // fils — min package price
  city_id: z.string(),
})
export type CompanyListItem = z.infer<typeof companyListItemSchema>

// Company profile (DISC-05)
export const companyProfileResponseSchema = z.object({
  id: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  description_en: z.string(),
  description_ar: z.string(),
  slug: z.string(),
  logo_url: z.string().nullable(),
  avg_rating: z.number(),
  review_count: z.number(),
  city_id: z.string(),
  carpet_lead_time_days: z.number().int(),
  packages: z.array(z.object({
    id: z.string(),
    category: z.enum(['car_wash', 'carpet', 'sofa']),
    name_en: z.string(),
    name_ar: z.string(),
    description_en: z.string(),
    description_ar: z.string(),
    base_price: z.number().int(),
    add_ons: z.array(z.object({
      id: z.string(),
      name_en: z.string(),
      name_ar: z.string(),
      price: z.number().int(),
    })),
  })),
  reviews: z.array(z.object({
    id: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
    created_at: z.string(),
  })),
})
export type CompanyProfile = z.infer<typeof companyProfileResponseSchema>
