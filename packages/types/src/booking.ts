import { z } from 'zod'

// POST /orders — on-site booking (car wash, sofa) per D-05, D-06
export const createOnSiteOrderSchema = z.object({
  package_id: z.string().min(1),
  quantity: z.number().int().positive(),
  add_on_ids: z.array(z.string()).default([]),
  service_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  location_note: z.string().max(500).optional(),
})
export type CreateOnSiteOrder = z.infer<typeof createOnSiteOrderSchema>

// POST /orders — carpet booking per D-07, D-18
export const createCarpetOrderSchema = z.object({
  package_id: z.string().min(1),
  quantity: z.number().int().positive(), // carpet count
  add_on_ids: z.array(z.string()).default([]),
  pickup_time: z.string().datetime(), // ISO 8601
  location_note: z.string().max(500).optional(),
  service_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
})
export type CreateCarpetOrder = z.infer<typeof createCarpetOrderSchema>

// POST /orders response
export const createOrderResponseSchema = z.object({
  order_id: z.string(),
  client_secret: z.string(), // Stripe PaymentIntent client_secret
})
export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>

// PATCH /orders/:id/carpet-return-date (CARP-04)
export const rescheduleReturnDateSchema = z.object({
  return_date: z.string().datetime(),
})
export type RescheduleReturnDate = z.infer<typeof rescheduleReturnDateSchema>

// PATCH /orders/:id/status
export const transitionOrderStatusSchema = z.object({
  status: z.string(), // validated against VALID_TRANSITIONS at runtime
})

// PATCH /orders/:id/assign-washer (ORD-03)
export const assignWasherSchema = z.object({
  washer_id: z.string().min(1),
})

// POST /orders/:id/washer-response (ORD-04)
export const washerResponseSchema = z.object({
  accepted: z.boolean(),
})

// Order summary for client display (BOOK-04)
export const orderSummarySchema = z.object({
  order_id: z.string(),
  type: z.enum(['on_site', 'carpet']),
  status: z.string(),
  package_name_en: z.string(),
  package_name_ar: z.string(),
  quantity: z.number().int(),
  amount_subtotal: z.number().int(),
  platform_fee: z.number().int(),
  amount_total: z.number().int(),
  add_ons: z.array(z.object({
    name_en: z.string(),
    name_ar: z.string(),
    price: z.number().int(),
  })),
  created_at: z.string(),
  service_location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  carpet_details: z.object({
    pickup_time: z.string().nullable(),
    return_date: z.string().nullable(),
    carpet_count: z.number().int().nullable(),
  }).nullable(),
})
export type OrderSummary = z.infer<typeof orderSummarySchema>
