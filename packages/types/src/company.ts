import { z } from 'zod'

// PUT /company/profile (COMP-01) — bilingual fields required per D-15
export const companyProfileSchema = z.object({
  name_en: z.string().min(2).max(100),
  name_ar: z.string().min(2).max(100),
  description_en: z.string().min(10).max(1000),
  description_ar: z.string().min(10).max(1000),
  logo_url: z.string().url().optional(),
})
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>

// PUT /company/services (COMP-02)
export const companyServicesSchema = z.object({
  city_ids: z.array(z.string().min(1)).min(1),
  categories: z.array(z.enum(['car_wash', 'carpet', 'sofa'])).min(1),
})
export type CompanyServicesInput = z.infer<typeof companyServicesSchema>

// POST /company/packages (COMP-03)
export const packageSchema = z.object({
  category: z.enum(['car_wash', 'carpet', 'sofa']),
  name_en: z.string().min(2).max(100),
  name_ar: z.string().min(2).max(100),
  description_en: z.string().min(5).max(500),
  description_ar: z.string().min(5).max(500),
  base_price: z.number().int().positive(), // in fils
})
export type PackageInput = z.infer<typeof packageSchema>

// POST /company/packages/:id/add-ons (COMP-03)
export const addOnSchema = z.object({
  name_en: z.string().min(2).max(100),
  name_ar: z.string().min(2).max(100),
  price: z.number().int().positive(), // in fils
})
export type AddOnInput = z.infer<typeof addOnSchema>

// POST /company/washers (COMP-04)
export const washerSchema = z.object({
  phone: z.string().min(8).max(15),
  name: z.string().min(2).max(100),
})
export type WasherInput = z.infer<typeof washerSchema>

// Stripe Connect onboarding (COMP-07)
export const stripeConnectResponseSchema = z.object({
  url: z.string().url(), // AccountLink URL
})
export type StripeConnectResponse = z.infer<typeof stripeConnectResponseSchema>
