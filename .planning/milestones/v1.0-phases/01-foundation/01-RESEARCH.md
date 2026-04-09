# Phase 1: Foundation - Research

**Researched:** 2026-03-31
**Domain:** Turborepo monorepo scaffold, Prisma+PostGIS schema, multi-role JWT auth, next-intl RTL i18n, BullMQ worker scaffold
**Confidence:** HIGH (primary choices verified via Context7, official docs, and cross-referenced WebSearch)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single `orders` table for common fields + `carpet_order_details` extension table. Order type column: `on_site` / `carpet`.
- **D-02:** Single status enum combining all states from both lifecycles (~13 unique states): `pending`, `accepted`, `washer_assigned`, `washer_en_route`, `in_progress`, `completed`, `cancelled`, `pickup_scheduled`, `picked_up`, `in_cleaning`, `ready_for_return`, `return_scheduled`, `out_for_return`, `returned`. Application layer enforces valid transitions per type.
- **D-03:** Bilingual content uses separate `_en` and `_ar` columns (e.g., `name_en`, `name_ar`). Not JSON, not a translations table. Both columns required — enforced at schema level.
- **D-04:** GPS columns use PostGIS `geography` type (not `geometry`, not plain floats). Enables `ST_DWithin` for radius-based company filtering.

### Claude's Discretion

- Hosting provider choice (Railway vs Fly.io) — research should compare
- Auth implementation details (Twilio vs alternatives, JWT structure, token storage)
- Monorepo package boundaries and naming conventions
- Prisma schema file organization (single file vs split)
- CI/CD pipeline configuration details
- Sentry project setup details
- Loading skeleton design for future UI phases

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Turborepo monorepo with 6 apps and shared packages | Turborepo 2.9.1 setup patterns, pnpm workspace config, Expo SDK 55 monorepo auto-detection |
| INFRA-02 | Prisma schema with all tables including both order lifecycle models | Prisma PostGIS `Unsupported("geography(Point,4326)")` pattern, D-01/D-02/D-03/D-04 schema decisions |
| INFRA-03 | Fastify API server on persistent host (Railway/Fly.io) with Socket.io | Railway recommendation (better solo-dev DX), Fastify v5 plugin setup, hosting comparison |
| INFRA-04 | Neon PostgreSQL (Bahrain region) with connection pooling | PgBouncer pooled URL, `@prisma/adapter-neon`, singleton pattern |
| INFRA-05 | Upstash Redis (Fixed Plan) for caching, rate limiting, and Socket.io adapter | ioredis 5.10.1, Fixed Plan critical warning, `maxmemory-policy noeviction` |
| INFRA-06 | BullMQ workers with graceful shutdown and idempotent job handlers | BullMQ 5.71.1, SIGTERM handler, `worker.close()`, idempotency keys |
| INFRA-07 | Cloudflare R2 for photo storage with signed URLs only | S3-compatible SDK pattern — Phase 3 concern, scaffold only in Phase 1 |
| INFRA-08 | GitHub Actions CI pipeline (lint + typecheck + test per PR) | Turborepo remote cache, per-package CI pattern |
| INFRA-09 | Sentry error tracking on all 5 app surfaces | Sentry SDK per surface, DSN per app |
| INFRA-10 | Zod validation on every API endpoint | `@fastify/type-provider-zod` or TypeBox; shared Zod schemas in `packages/types` |
| AUTH-01 | Customer sign up and log in via phone OTP (Twilio Verify) | Twilio Verify REST API, `@fastify/jwt`, JWT access+refresh token pattern |
| AUTH-02 | Customer session persists across app restart (JWT access + refresh tokens) | Refresh tokens stored in Upstash Redis keyed by userId, 30-day TTL |
| AUTH-03 | Company admin can log in with email and bcrypt password | bcrypt hash at registration, timing-safe compare at login |
| AUTH-04 | Company admin account requires TOTP MFA for payout access | `otplib` v13.4.0 (not speakeasy — unmaintained), TOTP secret stored encrypted in DB |
| AUTH-05 | Washer can log in via phone OTP + 4-digit PIN | Same OTP flow as customer + PIN hash stored in washer record |
| AUTH-06 | Platform admin can log in via Google Workspace SSO only | Auth.js v5 (NextAuth) on admin-web Next.js app only |
| AUTH-07 | Rate limiting enforced on OTP endpoints (3/phone/15min) | `@fastify/rate-limit` with Upstash Redis store, key by phone number |
| I18N-01 | All UI strings use i18n keys — no hardcoded English | `next-intl` for web (packages/i18n/locales/en.json + ar.json), `i18next` for Expo |
| I18N-02 | Arabic mode uses RTL layout with CSS logical properties throughout | `dir="rtl"` on `<html>`, Tailwind v4 `ms-*`/`me-*`/`ps-*`/`pe-*` only |
| I18N-03 | Database content fields have `_en` and `_ar` columns | Enforced by D-03 in Prisma schema — both fields `@db.Text` NOT NULL |
| I18N-04 | Customer can switch language; preference persists to profile | `preferred_language` column on users table; localStorage pre-auth |
| I18N-05 | Arabic font (Cairo) loaded with zero CLS | `next/font/google` with `display: 'swap'` and `variable: '--font-cairo'` |
| I18N-06 | Map labels switch to Arabic when AR mode is active | Google Maps `language` param or Mapbox `locale` — scaffold in Phase 1, implement in Phase 2 |
</phase_requirements>

---

## Summary

Phase 1 creates the entire foundation that every subsequent phase builds upon. The primary deliverables are: a Turborepo monorepo with 6 apps and shared packages scaffolded and wired together; the complete Prisma schema with all 15+ tables deployed to Neon (including PostGIS geography columns, bilingual `_en`/`_ar` columns, and the combined 14-state order enum); all four authentication paths wired end-to-end (customer/washer OTP via Twilio Verify, company email+bcrypt+TOTP MFA, platform admin Google SSO); and RTL/Arabic infrastructure in place across web and mobile shared packages so no component ever needs to be retrofitted.

The most important implementation details not covered by existing research are: (1) Prisma does not natively support PostGIS `geography` types — use `Unsupported("geography(Point, 4326)")` with a GIST index and `$queryRaw` for all spatial queries; (2) Fly.io no longer has a Bahrain region — the closest available is Mumbai (`bom`), making **Railway** the recommended host for solo-dev DX (Railway's Singapore region is comparable latency to Mumbai); (3) the Expo pnpm monorepo requires `nodeLinker: hoisted` in `.npmrc` for SDK 54 and earlier, or explicit isolated dependency support for SDK 55; and (4) `speakeasy` is unmaintained — use `otplib` v13.4.0 for TOTP.

**Primary recommendation:** Scaffold in this sequence — monorepo structure first, then shared packages (db, types, i18n), then Prisma schema + migrations, then Fastify skeleton + auth plugins, then auth routes, then Next.js/Expo i18n shells. Each step unblocks the next.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 1 |
|-----------|-------------------|
| Stitch Design Workflow: always run `/enhance-prompt` → `/stitch-loop` → `/react-components` for any UI | Auth screens (OTP, PIN, company login, Google SSO) must follow the 3-step Stitch workflow |
| Stitch Project Implementation: use `/shadcn-ui` skill + glassmorphism registry + Motion Primitives for every Stitch-to-app task | Auth component implementation must include glassmorphism + Motion Primitives (mandatory, not optional) |
| Never send raw/unenhanced prompt to Stitch | All Stitch calls in this phase go through `/enhance-prompt` first |
| shadcn initialized with new-york style, stone base color | Run `npx shadcn@latest init` with those settings before any component work |

---

## Standard Stack

### Core (Phase 1 specific — implementation versions verified)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| Turborepo | 2.9.1 | Monorepo orchestration + remote caching | npm view turbo version |
| pnpm | 9.x | Package manager (Turborepo recommended) | STACK.md verified |
| Prisma | 6.x (`@prisma/adapter-neon` 7.6.0) | ORM + schema + migrations | npm view |
| `@neondatabase/serverless` | 1.0.2 | Neon HTTP driver for Prisma | npm view |
| Fastify | 5.x | API server | STACK.md verified |
| `@fastify/jwt` | 10.0.0 | JWT auth plugin | npm view |
| `@fastify/rate-limit` | latest | OTP rate limiting | STACK.md |
| `@fastify/cors` | latest | CORS for web + mobile clients | STACK.md |
| next-intl | 4.8.3 | App Router i18n (next.js web apps) | npm view |
| i18next + react-i18next | latest | Expo mobile i18n | STACK.md |
| expo-localization | latest | Device locale detection in Expo | Expo docs |
| otplib | 13.4.0 | TOTP MFA for company admin (NOT speakeasy) | npm view; speakeasy unmaintained |
| bcryptjs | latest | Password hashing for company admin | Standard |
| Auth.js (next-auth) | 4.24.13 | Google SSO for admin-web only | npm view |
| BullMQ | 5.71.1 | Background job queues | npm view verified |
| ioredis | 5.10.1 | Redis client (BullMQ + Socket.io adapter) | npm view |
| Zod | 3.x | Schema validation (shared package) | STACK.md |

### Version Compatibility Matrix

| Package | Compatible With | Critical Note |
|---------|-----------------|---------------|
| Fastify 5.x | Node.js 20+ | Node 24 on this machine — fully compatible |
| Expo SDK 55 | React Native 0.83, React 19 | Requires `nodeLinker: hoisted` in `.npmrc` for pnpm |
| `@prisma/adapter-neon` 7.6.0 | Must match Prisma major | Use pooled connection string for Next.js, direct for Fastify |
| Auth.js v5 | Next.js 14+ (Next.js 16 supported) | App Router compatible via `auth()` function |
| otplib 13.4.0 | Node.js 18+ | Replaces unmaintained speakeasy |

### Installation Sequence

```bash
# 1. Bootstrap monorepo (run once in project root)
npm install -g pnpm   # pnpm not present on this machine — install first
npx create-turbo@latest cleanly --package-manager pnpm

# 2. pnpm-workspace.yaml (root)
# packages: [apps/*, packages/*]

# 3. .npmrc (root) — required for Expo + pnpm compatibility
# node-linker=hoisted
# shamefully-hoist=true

# 4. API app core dependencies
pnpm --filter @cleanly/api add fastify @fastify/jwt @fastify/cors @fastify/rate-limit
pnpm --filter @cleanly/api add prisma @prisma/client @prisma/adapter-neon @neondatabase/serverless
pnpm --filter @cleanly/api add bullmq ioredis
pnpm --filter @cleanly/api add otplib bcryptjs twilio zod

# 5. Admin web (Auth.js for Google SSO)
pnpm --filter @cleanly/admin-web add next-auth

# 6. Customer web + company web i18n
pnpm --filter @cleanly/customer-web add next-intl
pnpm --filter @cleanly/company-web add next-intl

# 7. Expo apps i18n
pnpm --filter @cleanly/customer-mobile add i18next react-i18next expo-localization @react-native-async-storage/async-storage
pnpm --filter @cleanly/washer-mobile add i18next react-i18next expo-localization @react-native-async-storage/async-storage
```

---

## Architecture Patterns

### Recommended Project Structure

```
cleanly/                                    # Turborepo root
├── .npmrc                                  # nodeLinker=hoisted (required for Expo + pnpm)
├── pnpm-workspace.yaml                     # packages: [apps/*, packages/*]
├── turbo.json                              # Pipeline: build, dev, lint, typecheck
├── package.json                            # packageManager: pnpm@9.x
├── apps/
│   ├── api/                                # Fastify API + Socket.io + BullMQ workers
│   │   └── src/
│   │       ├── plugins/                    # auth.ts, cors.ts, rate-limit.ts
│   │       ├── routes/
│   │       │   └── auth/                   # otp.ts, company.ts, admin.ts, washer.ts
│   │       ├── services/                   # auth.service.ts, totp.service.ts
│   │       ├── workers/                    # notification.worker.ts (BullMQ)
│   │       ├── queues/                     # queues.ts (BullMQ queue definitions)
│   │       └── lib/
│   │           ├── prisma.ts               # PrismaClient singleton
│   │           └── redis.ts                # ioredis singleton
│   ├── customer-web/                       # Next.js 16 App Router
│   │   └── app/[locale]/
│   │       ├── layout.tsx                  # dir={locale==='ar'?'rtl':'ltr'}, Cairo font
│   │       └── auth/                       # OTP screens (Stitch workflow)
│   ├── customer-mobile/                    # Expo SDK 55
│   ├── company-web/                        # Vite + React SPA
│   │   └── src/
│   ├── washer-mobile/                      # Expo SDK 55
│   └── admin-web/                          # Next.js 16 App Router + Auth.js
│       └── app/api/auth/[...nextauth]/
├── packages/
│   ├── db/                                 # Prisma schema + migrations
│   │   ├── schema.prisma                   # Single file — all models
│   │   └── migrations/
│   ├── types/                              # Shared Zod schemas + TS types
│   │   ├── auth.ts                         # JWTPayload, role enum
│   │   ├── order.ts                        # OrderStatus enum, VALID_TRANSITIONS
│   │   └── api.ts                          # Request/response shapes
│   ├── ui/                                 # shadcn/ui web components (RTL-first)
│   │   └── src/
│   │       ├── otp-input.tsx               # Custom: 6-box, RTL digit order
│   │       ├── pin-input.tsx               # Custom: 4-box, obscured
│   │       ├── phone-input.tsx             # Custom: country code prefix
│   │       ├── language-toggle.tsx         # Custom: EN/AR switcher
│   │       └── auth-card.tsx               # Custom: brand card wrapper
│   ├── ui-native/                          # React Native components (Expo)
│   ├── i18n/                               # Translation files
│   │   └── locales/
│   │       ├── en.json                     # English strings (all i18n keys)
│   │       └── ar.json                     # Arabic strings
│   └── config/                             # Shared ESLint, TypeScript, Tailwind configs
└── .github/
    └── workflows/
        └── ci.yml                          # lint + typecheck + test on PR
```

**Schema file decision:** Single `schema.prisma` file (not split). With Prisma v6 there is no native support for splitting schema files. Keep all models in one file until schema is so large it becomes unwieldy (not a concern for Phase 1's 15 tables).

### Pattern 1: Turborepo turbo.json Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", ".expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Key:** `"dependsOn": ["^build"]` ensures packages build before apps that depend on them. `persistent: true` for dev keeps watchers alive.

### Pattern 2: Prisma Schema — PostGIS Geography Type

Prisma does not natively support PostGIS. Use `Unsupported("geography(Point, 4326)")` with a manually-written GIST index in the migration SQL.

```prisma
// packages/db/schema.prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../generated/client"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

model Company {
  id          String   @id @default(cuid())
  name_en     String
  name_ar     String
  // ... other bilingual fields
  location    Unsupported("geography(Point, 4326)")?
  // @@index on location is added manually in migration SQL (GIST)
}
```

**Migration process:** Run `prisma migrate dev --create-only`, then open the generated SQL and add:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX "company_location_idx" ON "Company" USING GIST ("location");
```

**Spatial queries (always use $queryRaw):**
```typescript
// Find companies within 20km of customer GPS
const nearbyIds = await prisma.$queryRaw<{ id: string }[]>`
  SELECT id FROM "Company"
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
    ${radiusMeters}
  )
`
const companies = await prisma.company.findMany({
  where: { id: { in: nearbyIds.map(r => r.id) } }
})
```

### Pattern 3: Combined Order Status Enum (D-02)

```prisma
// In schema.prisma
enum OrderStatus {
  pending
  accepted
  washer_assigned
  washer_en_route
  in_progress
  completed
  cancelled
  pickup_scheduled
  picked_up
  in_cleaning
  ready_for_return
  return_scheduled
  out_for_return
  returned
}

enum OrderType {
  on_site
  carpet
}

model Order {
  id                String      @id @default(cuid())
  type              OrderType
  status            OrderStatus @default(pending)
  customer_id       String
  company_id        String
  washer_id         String?
  // payment fields
  amount_total      Int         // in fils/halalas
  platform_fee      Int
  payment_intent_id String?
  // timestamps
  created_at        DateTime    @default(now())
  updated_at        DateTime    @updatedAt
  // Relations
  customer          User        @relation(fields: [customer_id], references: [id])
  company           Company     @relation(fields: [company_id], references: [id])
  carpet_details    CarpetOrderDetails?
}

model CarpetOrderDetails {
  id               String   @id @default(cuid())
  order_id         String   @unique
  return_date      DateTime?
  pickup_time      DateTime?
  pickup_photo_url String?
  return_photo_url String?
  order            Order    @relation(fields: [order_id], references: [id])
}
```

### Pattern 4: Fastify JWT Auth Plugin Setup

```typescript
// apps/api/src/plugins/auth.ts
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '15m' },    // access token TTL
  })

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
})

// JWT payload shape (packages/types/src/auth.ts)
export interface JWTPayload {
  sub: string                                      // userId
  role: 'customer' | 'washer' | 'company_member' | 'admin'
  companyId?: string                               // present for company_member only
  iat: number
  exp: number
}
```

**Refresh token pattern:** Access token (15min JWT), Refresh token (30-day opaque token stored in Upstash Redis keyed `rt:{userId}`). On refresh: verify Redis token exists, issue new access token, rotate refresh token.

**Rate limiting OTP (AUTH-07):**
```typescript
// apps/api/src/routes/auth/otp.ts
fastify.register(rateLimit, {
  max: 3,
  timeWindow: '15 minutes',
  keyGenerator: (req) => (req.body as any).phone,   // key by phone, not IP
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Maximum 3 OTP requests per 15 minutes',
  }),
})
```

### Pattern 5: TOTP MFA for Company Admin (AUTH-04)

Use `otplib` (NOT speakeasy — it is unmaintained with 0 updates in 7 years):

```typescript
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// On company admin registration — generate TOTP secret
const secret = authenticator.generateSecret()  // store encrypted in DB
const otpauth = authenticator.keyuri(email, 'Cleanly', secret)
const qrCodeUrl = await QRCode.toDataURL(otpauth)
// Show QR to admin once; they scan into Google Authenticator / Authy

// On login MFA step — verify TOTP token
const isValid = authenticator.verify({ token: userInputToken, secret: storedSecret })
```

**otplib defaults:** 30-second TOTP window, SHA1 HMAC, 6-digit token — matches Google Authenticator behavior.

### Pattern 6: Auth.js v5 Google SSO for Admin (AUTH-06)

```typescript
// apps/admin-web/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Restrict to specific Google Workspace domain
      return profile?.email?.endsWith('@cleanly.ae') ?? false
    },
  },
})

// apps/admin-web/app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/auth'
```

**Admin JWT bridge:** Auth.js issues a session cookie for the admin Next.js app. For API calls to the Fastify backend, exchange the Auth.js session for a short-lived Fastify JWT by calling a dedicated `POST /auth/admin/exchange` endpoint that verifies the Google email domain.

### Pattern 7: next-intl App Router Setup with RTL

```typescript
// apps/customer-web/src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
})

// apps/customer-web/middleware.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

// apps/customer-web/app/[locale]/layout.tsx
import { Cairo } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',               // I18N-05: zero CLS
  variable: '--font-cairo',
})

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  return (
    <html lang={locale} dir={dir} className={cairo.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

**Translation file location:** `packages/i18n/locales/en.json` and `ar.json` at monorepo level. Each app imports and re-exports the locale files so they share the same string keys.

### Pattern 8: Expo RTL + i18next Setup

```typescript
// packages/i18n/src/expo-i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { I18nManager } from 'react-native'
import * as Localization from 'expo-localization'
import en from '../locales/en.json'
import ar from '../locales/ar.json'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  fallbackLng: 'en',
  lng: Localization.getLocales()[0]?.languageCode ?? 'en',
})

export async function switchLanguage(lang: 'en' | 'ar') {
  await AsyncStorage.setItem('preferred_language', lang)
  I18nManager.forceRTL(lang === 'ar')
  await i18n.changeLanguage(lang)
  // App restart required for full RTL flip on React Native
  // Use expo-updates or RNRestart: RNRestart.Restart()
}
```

**Critical note:** `I18nManager.forceRTL(true)` requires an app restart to take full effect on React Native. Design the language switch UX with a "restart now?" dialog. The web (`dir="rtl"`) switches without restart.

### Pattern 9: BullMQ Worker with Graceful Shutdown

```typescript
// apps/api/src/workers/notification.worker.ts
import { Worker } from 'bullmq'
import { redis } from '../lib/redis'

const worker = new Worker(
  'notifications',
  async (job) => {
    // Idempotency: check if job already processed
    const alreadySent = await redis.get(`job:sent:${job.id}`)
    if (alreadySent) return

    // Process the job
    await handleNotification(job.data)

    // Mark as sent (TTL = 7 days)
    await redis.set(`job:sent:${job.id}`, '1', 'EX', 604800)
  },
  { connection: redis, concurrency: 5 }
)

// Graceful shutdown — CRITICAL for avoiding stalled jobs on deploy
async function shutdown() {
  await worker.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

**ioredis config for BullMQ:**
```typescript
// apps/api/src/lib/redis.ts
import { Redis } from 'ioredis'

export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,   // REQUIRED for BullMQ — do not omit
  enableReadyCheck: false,      // Upstash compatibility
  tls: {},                      // Upstash always requires TLS
})
```

### Pattern 10: Prisma Singleton for Fastify

```typescript
// apps/api/src/lib/prisma.ts
import { PrismaClient } from '@cleanly/db'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
export const prisma = new PrismaClient({ adapter })

// Never instantiate PrismaClient inside a request handler.
// This singleton is shared across all route handlers.
```

**Connection string rules:**
- Fastify long-running process: use the **direct** Neon connection string (not `-pooler`) — Prisma manages its own pool
- Next.js API routes (serverless): use the **pooled** (`-pooler.neon.tech`) Neon connection string

### Anti-Patterns to Avoid

- **Calling `new PrismaClient()` inside request handlers:** Creates a new connection pool per request; exhausts Neon's connection limit under load.
- **Using `geometry` PostGIS type instead of `geography`:** `geometry` uses flat-plane math, `geography` uses spheroid (WGS84) — required for accurate washer proximity search across real-world distances.
- **Configuring Upstash Redis with Pay-As-You-Go plan for BullMQ:** BullMQ polls Redis continuously; PAYG billing becomes unpredictable. Always use Upstash Fixed Plan.
- **Using `marginLeft`/`marginRight` in any component:** Breaks RTL silently. Use `ms-*`/`me-*` (Tailwind) or `marginStart`/`marginEnd` (React Native) from the first line of code.
- **Using `speakeasy` for TOTP:** Unmaintained (last commit 2019). Use `otplib` instead.
- **Using Expo Go for testing monorepo setup:** Push notifications and certain plugins require a development build. Set up EAS Build early.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone OTP verification | Custom SMS sending + verification code storage + expiry logic | Twilio Verify API | Twilio handles retry, fraud detection, adaptive routing, expiry — homegrown OTP is a security liability |
| TOTP MFA | Custom time-based token math | `otplib` v13.4.0 | RFC 6238 compliance, timing-attack-safe comparison, handles clock skew — do not implement TOTP math manually |
| Monorepo workspace linking | Symlinks, path aliases, npm link | pnpm workspaces + Turborepo | Manual workspace management breaks under hoisting edge cases; Turborepo handles dependency ordering |
| JWT decode/verify | `jsonwebtoken` directly | `@fastify/jwt` | Fastify plugin provides `request.jwtVerify()`, `reply.jwtSign()`, and proper error handling integrated into Fastify's lifecycle |
| Database connection pooling | PgBouncer self-hosted | Neon built-in PgBouncer (pooled connection string) | Zero ops, handles 10,000 connections, already included in Neon |
| RTL detection | Manual locale string parsing | `rtl-detect` npm package (web) / `I18nManager` (React Native) | Handles edge cases in locale codes (`ar-AE` vs `ar`) correctly |
| PostGIS spatial indexing | Manual SQL triggers | Prisma `migrate dev --create-only` → edit SQL | PostGIS GIST index must be added in migration SQL — Prisma handles the migration framework, you add the index |

---

## Hosting Decision (Claude's Discretion — D-05)

**Recommendation: Railway**

| Factor | Railway | Fly.io |
|--------|---------|--------|
| Closest Gulf region | Singapore (`sin`) — ~120ms to UAE | Mumbai (`bom`) — ~80ms to UAE |
| Bahrain region | No | No — Fly.io removed/never had Bahrain |
| Solo developer DX | Excellent (web UI, simple config) | Good (CLI-heavy, steeper learning curve) |
| WebSocket support | Yes (persistent processes) | Yes (persistent processes, explicit WebSocket support) |
| BullMQ workers | One service for API, one for worker | Same (separate machines) |
| Free/cheap entry | Starter plan: $5/mo | Shared CPU: ~$5/mo |

**Verdict:** Both have comparable Gulf latency (Mumbai vs Singapore). Railway wins on solo-dev DX for initial setup and ongoing operations. The ~40ms latency difference vs Fly.io Mumbai is not material at MVP scale.

**Deploy structure:**
- `api` Fastify service: Railway service 1 (start: `node dist/server.js`)
- `worker` BullMQ service: Railway service 2 (same repo, start: `node dist/worker.js`)
- Both services share environment variables via Railway's shared environment feature.

---

## Common Pitfalls

### Pitfall 1: Expo + pnpm Isolated Dependencies Break Native Builds

**What goes wrong:** Default pnpm uses isolated dependency installation. Expo SDK 54 and earlier cannot find React Native native modules when dependencies are isolated — native build fails with "module not found" errors that don't appear in Expo Go.

**Why it happens:** pnpm's isolation means `react-native` and its native dependencies are not in a predictable node_modules location that native build tools expect.

**How to avoid:** Add to `.npmrc` at monorepo root:
```
node-linker=hoisted
shamefully-hoist=true
```
This is required for SDK 54 and earlier. SDK 55 claims isolated dependency support but the `.npmrc` approach is safer for a greenfield project.

**Warning signs:** `npx expo start` works but EAS Build fails; native module errors in production builds.

### Pitfall 2: PostGIS Migration Loses GIST Index on Prisma Migrate Reset

**What goes wrong:** `prisma migrate reset` or `prisma db push` in development regenerates migrations and drops the manually-added GIST index. After reset, spatial queries work but are doing full table scans — no error, just slow.

**Why it happens:** Prisma only tracks what is in the schema.prisma. The `@@index` syntax for GIST indices isn't supported by Prisma (only BTREE, HASH, BRIN, GIN are supported), so the GIST index is added manually and gets lost on migration regeneration.

**How to avoid:** Create a separate idempotent SQL migration file (`0001_add_postgis_indexes.sql`) that is run after Prisma migrations via a `postmigrate` script or Prisma's `$executeRaw` in the seed file.

**Warning signs:** `ST_DWithin` queries take >100ms in development (should be <5ms with index).

### Pitfall 3: Auth.js v5 Session Doesn't Reach Fastify Backend

**What goes wrong:** Admin users authenticate via Auth.js (Google SSO) on the admin Next.js app. But the Fastify API uses `@fastify/jwt` — it does not understand Auth.js session cookies. Admin API calls return 401.

**Why it happens:** Auth.js and Fastify JWT are separate auth systems. Auth.js session is a cookie-based session; Fastify expects a Bearer JWT. These don't interoperate out of the box.

**How to avoid:** Implement a JWT exchange endpoint on Fastify: `POST /auth/admin/exchange` accepts a trusted internal token (signed with a shared secret from the Auth.js session) and returns a standard Fastify JWT. The admin Next.js app calls this once after Google SSO completes, stores the Fastify JWT, and uses it for all subsequent API calls.

**Warning signs:** Admin Next.js pages work but API requests from server components return 401.

### Pitfall 4: next-intl Locale Parameter is Async in Next.js 16

**What goes wrong:** In Next.js 16, `params` in layout/page components is now a Promise. Code using `params.locale` directly (not awaited) gets a Promise object instead of the locale string, causing runtime errors in the `dir` attribute and `<html lang>` attribute.

**Why it happens:** Next.js 16 made all dynamic segment params async. Most tutorials show the old synchronous syntax.

**How to avoid:**
```typescript
// CORRECT for Next.js 16:
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params  // must await
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  // ...
}

// WRONG (Next.js 15 syntax, breaks in Next.js 16):
export default function LocaleLayout({ children, params: { locale } }) { }
```

**Warning signs:** `dir` attribute is `"[object Promise]"` in rendered HTML; Arabic layout never activates.

### Pitfall 5: BullMQ + Upstash TLS Configuration Missing

**What goes wrong:** BullMQ worker connects to Upstash Redis without TLS. Upstash requires TLS — connection fails silently or with cryptic errors. Jobs are enqueued but never processed.

**Why it happens:** The default ioredis connection string `redis://...` doesn't enable TLS. Upstash requires `rediss://...` (note double `s`) or explicit TLS config.

**How to avoid:** Always use:
```typescript
new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  tls: {},           // enables TLS — required for Upstash
})
```
Upstash provides a `UPSTASH_REDIS_URL` that starts with `rediss://` — ioredis parses this and enables TLS automatically. Alternatively set `tls: {}` explicitly.

**Warning signs:** BullMQ queue add succeeds but `worker.on('completed')` never fires; Upstash dashboard shows no commands.

### Pitfall 6: i18n Key Gaps — Arabic Strings Missing at Phase 1 Ship

**What goes wrong:** English strings are defined in `en.json` during development. Arabic counterparts in `ar.json` are added "later." Phase 1 ships with 60% of Arabic strings missing — the app shows i18n key placeholders (e.g., `auth.otp.send_cta`) in Arabic mode.

**Why it happens:** Developer tests in English during development and only notices missing Arabic strings when switching to Arabic locale (which happens rarely in development).

**How to avoid:** Create the complete `ar.json` alongside `en.json` for every string added, even if with placeholder Arabic text. Use a CI check that validates `ar.json` and `en.json` have the same keys. The UI-SPEC's copywriting contract provides all Phase 1 English strings and their i18n keys — use this as the source of truth.

**Warning signs:** Switching to Arabic mode shows raw key strings instead of Arabic text.

---

## Code Examples

### Turborepo pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml (monorepo root)
packages:
  - 'apps/*'
  - 'packages/*'
```

```ini
# .npmrc (monorepo root) — required for Expo pnpm compatibility
node-linker=hoisted
shamefully-hoist=true
```

### Prisma Schema — Bilingual Columns (D-03)

```prisma
// Example: Company model with bilingual fields (D-03)
model Company {
  id              String   @id @default(cuid())
  name_en         String   @db.Text          // NOT NULL enforced by Prisma
  name_ar         String   @db.Text          // NOT NULL enforced by Prisma
  description_en  String   @db.Text
  description_ar  String   @db.Text
  slug            String   @unique
  location        Unsupported("geography(Point, 4326)")?
  city_id         String
  is_verified     Boolean  @default(false)
  preferred_language String @default("en")
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  city     City    @relation(fields: [city_id], references: [id])
  orders   Order[]
  washers  User[]  @relation("CompanyWashers")
}
```

### GitHub Actions CI (INFRA-08)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ github.sha }}
          restore-keys: turbo-
      - run: pnpm turbo lint typecheck
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

### Sentry Setup Scaffold (INFRA-09)

```typescript
// apps/api/src/lib/sentry.ts — Fastify
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
})

// In Fastify app: register Sentry error handler as last plugin
fastify.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error)
  reply.status(error.statusCode ?? 500).send({ error: error.message })
})
```

Each of the 5 app surfaces (api, customer-web, company-web, customer-mobile, washer-mobile, admin-web) needs its own Sentry project with its own DSN.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `speakeasy` for TOTP | `otplib` v13.x | speakeasy abandoned ~2019 | Use otplib; speakeasy has unpatched vulnerabilities |
| Expo SDK manual Metro monorepo config | Auto-detection in SDK 52+ | SDK 52 (2024) | Remove `watchFolders`/`resolver.nodeModulesPath` if upgrading old project |
| NextAuth v4 (`pages/api/auth`) | Auth.js v5 (`auth.ts` + App Router) | v5 stable 2024 | New `auth()` universal function; configure in `auth.ts` not inside `api/` |
| Next.js built-in i18n (Pages Router) | `next-intl` (App Router) | Next.js 13 App Router | App Router removed built-in i18n; `next-intl` is the standard replacement |
| `params.locale` (sync) | `await params` then `.locale` (async) | Next.js 15/16 | All dynamic params are Promises in Next.js 16 |
| Fly.io Bahrain (`bah`) region | Fly.io Mumbai (`bom`) or Railway Singapore | 2024-2025 consolidation | Fly.io reduced its region count; no Middle East region currently |

**Deprecated/outdated:**
- `speakeasy`: Unmaintained since 2019. Do not use. `otplib` is the maintained replacement.
- Expo `watchFolders` manual Metro config: Removed in SDK 52. Delete from any existing `metro.config.js`.
- Next.js `pages/api/auth/[...nextauth]` (v4 pattern): Replaced by App Router route handler in v5.

---

## Open Questions

1. **Neon Bahrain region availability**
   - What we know: Neon documentation mentions multi-region support and the STATE.md notes "Confirm availability at project init"
   - What's unclear: Whether `me-1` (Middle East) Neon region is currently available or waitlisted
   - Recommendation: At monorepo init, run `npx neon regions list` or check the Neon console to confirm Bahrain/Middle East region before setting DATABASE_URL. Fall back to AWS `ap-south-1` (Mumbai) if unavailable.

2. **Admin JWT exchange security model**
   - What we know: Auth.js session and Fastify JWT are separate systems
   - What's unclear: Whether a shared-secret JWT exchange or a dedicated admin API key is more appropriate
   - Recommendation: Use a short-lived (5-min) exchange token signed with a separate `ADMIN_JWT_EXCHANGE_SECRET` env var. Exchange endpoint verifies Google email domain before issuing Fastify JWT.

3. **Turborepo remote cache setup**
   - What we know: Turborepo remote cache requires a TURBO_TOKEN
   - What's unclear: Whether to use Vercel Remote Cache (free with Vercel account) or self-hosted
   - Recommendation: Use Vercel Remote Cache (zero infrastructure, free tier). If the project has no Vercel account yet, CI will still work without remote cache — just slower.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | YES | v24.14.0 | — |
| npm | Package installs | YES | 11.9.0 | — |
| pnpm | Turborepo monorepo | NO | — | Install: `npm install -g pnpm` |
| git | Version control | YES | 2.52.0 | — |
| Turborepo CLI | Monorepo orchestration | YES (via npx) | 2.9.1 | `npm install -g turbo` |
| Neon account | Database | UNVERIFIED | — | Create at neon.tech |
| Upstash account | Redis | UNVERIFIED | — | Create at upstash.com (Fixed Plan) |
| Twilio account | OTP SMS | UNVERIFIED | — | Create at twilio.com |
| Google Cloud project | Admin Google SSO | UNVERIFIED | — | Create OAuth 2.0 credentials |
| Railway account | API hosting | UNVERIFIED | — | Create at railway.app |
| Vercel account | Next.js hosting | UNVERIFIED | — | Create at vercel.com |
| Sentry account | Error tracking | UNVERIFIED | — | Create at sentry.io (5 projects needed) |

**Missing dependencies with no fallback:**
- `pnpm` must be installed before monorepo initialization — run `npm install -g pnpm` as Wave 0 task.

**Missing dependencies with fallback:**
- All external service accounts (Neon, Upstash, Twilio, etc.) are account creation tasks, not blocking installs. Plan must include account setup tasks in Wave 0.

---

## Sources

### Primary (HIGH confidence)

- Context7 `/fastify/fastify` v5.x — Fastify plugin pattern, JWT plugin, route structure
- Context7 `/fastify/fastify-jwt` — `request.jwtVerify()`, `fastify.decorate()` pattern
- Context7 `/llmstxt/prisma_io_llms_txt` — Neon adapter pattern, generated client path
- Context7 `/vercel/next.js` v16.x — App Router layout, Cairo font loading, async params
- Context7 `/expo/expo` SDK 55 — monorepo detection, background location limitations
- Expo official docs (docs.expo.dev/guides/monorepos/) — pnpm hoisting requirements, SDK 52+ auto-detection
- BullMQ official docs (docs.bullmq.io/guide/workers/graceful-shutdown) — `worker.close()` pattern
- Auth.js official docs (authjs.dev) — v5 Google provider, App Router route handler
- next-intl official docs (next-intl.dev/docs/getting-started/app-router) — locale routing, middleware setup
- Fly.io official regions docs (fly.io/docs/reference/regions/) — confirmed no Bahrain region
- npm registry version verification — turbo@2.9.1, next-intl@4.8.3, @fastify/jwt@10.0.0, bullmq@5.71.1, otplib@13.4.0, ioredis@5.10.1

### Secondary (MEDIUM confidence)

- freddydumont.com/blog/prisma-postgis — `Unsupported("geography(Point, 4326)")` pattern, migration SQL workflow (verified against Prisma GitHub issue #25768)
- alizahid.dev/blog/geo-queries-with-prisma — `$queryRaw` ST_DWithin pattern (verified approach for Prisma PostGIS)
- thesoftwarescout.com/fly-io-vs-railway-2026 — Railway vs Fly.io 2026 comparison
- geekyants.com/blog/implementing-rtl-right-to-left-in-react-native-expo — `I18nManager.forceRTL()` + restart requirement

### Tertiary (LOW confidence — needs validation)

- Neon Bahrain/Middle East region availability: unconfirmed at research time; verify at project init via Neon console

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry and prior Context7 research
- Architecture: HIGH — follows patterns verified in STACK.md, ARCHITECTURE.md, CONTEXT7_VERIFIED.md
- PostGIS pattern: MEDIUM — `Unsupported()` approach verified against official Prisma GitHub issues and community articles; the GIST index migration workaround is well-documented
- Hosting recommendation: HIGH — Fly.io Bahrain absence verified against official Fly.io docs
- Pitfalls: HIGH — derived from PITFALLS.md (previously verified) plus new Phase 1-specific patterns

**Research date:** 2026-03-31
**Valid until:** 2026-04-28 (30 days — stable libraries; Auth.js v5 API may shift faster, re-verify if >2 weeks before planning)
