/**
 * Environment variable validation (ENV-02)
 *
 * Validates all required env vars at startup using Zod.
 * Missing or malformed vars cause a clean crash with a descriptive error message,
 * not a silent undefined that surfaces later as a cryptic runtime failure.
 *
 * Usage: import { env } from './lib/env.js' — do NOT read process.env directly
 * in new code.
 */

import { z } from 'zod'

const envSchema = z.object({
  // --- Runtime ---
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // --- Database (Neon) — BOTH required ---
  DATABASE_URL: z.string().url().refine((u) => u.includes('-pooler'), {
    message: 'DATABASE_URL must be the POOLED Neon URL (hostname should contain "-pooler")',
  }),
  DIRECT_URL: z.string().url().refine((u) => !u.includes('-pooler'), {
    message: 'DIRECT_URL must be the DIRECT Neon URL (hostname should NOT contain "-pooler")',
  }),

  // --- Redis (Upstash) ---
  UPSTASH_REDIS_URL: z.string().refine((u) => u.startsWith('rediss://'), {
    message: 'UPSTASH_REDIS_URL must use TLS (rediss:// not redis://)',
  }),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // --- JWT (auth) ---
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),

  // --- Twilio (OTP + SMS) ---
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'TWILIO_ACCOUNT_SID must start with AC'),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().startsWith('VA', 'TWILIO_VERIFY_SERVICE_SID must start with VA'),
  TWILIO_PHONE_NUMBER: z.string().optional(), // Only required for non-OTP SMS sending

  // --- Stripe ---
  STRIPE_SECRET_KEY: z.string().refine((k) => k.startsWith('sk_test_') || k.startsWith('sk_live_'), {
    message: 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_',
  }),
  // Webhook secret is optional locally (no webhook endpoint in dev), required in staging/production
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // --- Resend (email) ---
  RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY must start with re_').optional(),

  // --- 360dialog (WhatsApp) — optional until account + template approval ---
  DIALOG360_API_KEY: z.string().optional(),

  // --- Cloudflare R2 (photo storage) ---
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().default('cleanly-photos'),
  R2_PUBLIC_URL: z.string().url(),

  // --- Sentry (error tracking) — optional in development ---
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // --- Expo Push (optional) ---
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // --- App URLs (CORS + Stripe Connect redirects) ---
  CUSTOMER_WEB_URL: z.string().url().default('http://localhost:3001'),
  COMPANY_WEB_URL: z.string().url().default('http://localhost:3002'),
  ADMIN_WEB_URL: z.string().url().default('http://localhost:3003'),
  CUSTOMER_MOBILE_URL: z.string().default('http://localhost:8081'),
  WASHER_MOBILE_URL: z.string().default('http://localhost:8082'),
  ALLOWED_ORIGINS: z.string().optional(),

  // --- Admin SSO exchange secret ---
  ADMIN_EXCHANGE_SECRET: z.string().min(16, 'ADMIN_EXCHANGE_SECRET must be at least 16 chars'),

  // --- Feature Flags ---
  WHATSAPP_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  BYPASS_SENTRY: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
})

// Production-only strictness: some optional vars become required in production
const prodSchema = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production' && data.NODE_ENV !== 'staging') return

  const prodRequired: Array<[string, unknown]> = [
    ['STRIPE_WEBHOOK_SECRET', data.STRIPE_WEBHOOK_SECRET],
    ['RESEND_API_KEY', data.RESEND_API_KEY],
  ]

  // BYPASS_SENTRY: honored only in staging, ignored in production
  const sentryBypassActive = data.BYPASS_SENTRY && data.NODE_ENV !== 'production'
  if (!sentryBypassActive) {
    prodRequired.push(['SENTRY_DSN', data.SENTRY_DSN])
  }

  for (const [name, value] of prodRequired) {
    if (!value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${name} is required in ${data.NODE_ENV}`,
        path: [name],
      })
    }
  }
})

// WHATSAPP_ENABLED gate — applies in ALL environments (not just prod/staging)
const fullSchema = prodSchema.superRefine((data, ctx) => {
  if (data.WHATSAPP_ENABLED && !data.DIALOG360_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'DIALOG360_API_KEY is required when WHATSAPP_ENABLED=true',
      path: ['DIALOG360_API_KEY'],
    })
  }
})

export type Env = z.infer<typeof envSchema>

/**
 * Parse and validate process.env. Call once at server startup.
 * Crashes the process with a readable error on validation failure.
 */
function loadEnv(): Env {
  const result = fullSchema.safeParse(process.env)

  if (!result.success) {
    console.error('\n Environment validation failed:\n')
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      console.error(`  - ${key}: ${issue.message}`)
    }
    console.error('\nFix the .env file and restart. See .env.example for reference.\n')
    process.exit(1)
  }

  // Emit warning when Sentry bypass is active (non-production only)
  if (result.data.BYPASS_SENTRY && result.data.NODE_ENV !== 'production') {
    console.warn(`\nWARN: Sentry bypassed in ${result.data.NODE_ENV} — error tracking disabled\n`)
  }

  return result.data
}

export const env = loadEnv()
