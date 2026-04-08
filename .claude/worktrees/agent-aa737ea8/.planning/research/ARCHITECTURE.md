# Architecture Research

**Domain:** On-demand cleaning services marketplace (multi-role, multi-surface)
**Researched:** 2026-03-30
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (5 surfaces)                        │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│  Customer    │  Customer    │  Company     │  Washer      │  Admin           │
│  Web         │  Mobile      │  Web         │  Mobile      │  Web             │
│  (Next.js)   │  (Expo)      │  (Vite/React)│  (Expo)      │  (Next.js)       │
│              │              │              │              │                  │
│  Book, Track │  Book, Track │  Manage      │  Jobs, GPS,  │  Platform        │
│  Pay, Review │  Pay, Review │  Orders,     │  Photos,     │  oversight,      │
│              │              │  Analytics   │  Checklist   │  Config, Data    │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴────────┬────────┘
       │              │              │              │                │
       └──────────────┴──────────────┴──────────────┴────────────────┘
                                     │ HTTPS + WSS
┌────────────────────────────────────┼────────────────────────────────────────┐
│                             API GATEWAY LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │          Fastify API Server (single process, modular plugins)         │   │
│  │  Auth Plugin │ Rate Limiting │ CORS │ Request Logging │ Error Handler │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Socket.io Server (same process)                 │   │
│  │  /orders namespace │ /tracking namespace │ /notifications namespace   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬───────────────────────────────────────-┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                             SERVICE LAYER                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │   Auth     │ │   Order    │ │  Payment   │ │  Location  │ │  Notify   │ │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │ │  Service  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │  Company   │ │   Media    │ │ Analytics  │ │  Promo /   │               │
│  │  Service   │ │  Service   │ │  Service   │ │  Wallet    │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                             DATA LAYER                                       │
│  ┌─────────────────────┐  ┌────────────────────┐  ┌───────────────────────┐ │
│  │  Neon PostgreSQL     │  │  Upstash Redis     │  │  Cloudflare R2        │ │
│  │  (Bahrain region)    │  │  (cache + pub/sub  │  │  (photos, signed      │ │
│  │  Primary datastore   │  │   + BullMQ + GPS   │  │   URLs, CDN)          │ │
│  │  Prisma ORM          │  │   location cache)  │  │                       │ │
│  └─────────────────────┘  └────────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

External Services:
  Stripe / Stripe Connect → Payment capture + company payouts
  Twilio                  → OTP SMS + fallback notifications
  Resend                  → Transactional email
  360dialog               → WhatsApp notifications
  Expo Push               → Mobile push notifications
  Google SSO              → Admin authentication only
```

### Component Responsibilities

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| Customer Web (Next.js) | Browsing, booking, payment, real-time tracking, reviews | App Router; SSR for SEO on service pages |
| Customer Mobile (Expo) | Same as web + push notifications, location permission | Uses shared `@cleanly/api-client` package |
| Company Web (Vite React) | Order management, washer assignment, analytics, onboarding | SPA only — no SSR needed |
| Washer Mobile (Expo) | Job list, GPS broadcasting, camera for photos, checklists | GPS runs as background task when active |
| Admin Web (Next.js) | Platform oversight, company approval, config, reports | Next.js for auth pages (SSR needed) |
| Fastify API | All business logic, REST endpoints, WebSocket upgrade | Single process; Fastify plugins for modularity |
| Socket.io Server | Real-time GPS push, order state events, notifications | Runs embedded in Fastify process |
| Auth Service | JWT issuance, OTP verification, role claim embedding | Role encoded in token: customer/washer/company/admin |
| Order Service | State machine execution, order lifecycle transitions | Enforces valid transitions only |
| Payment Service | Stripe charge, capture, Connect transfer, wallet | Holds funds until order completes |
| Location Service | Receives washer GPS, stores in Redis, broadcasts via Socket.io | Redis key: `loc:{washerId}` TTL 60s |
| Media Service | Issues R2 presigned PUT URLs, records upload metadata in DB | Client uploads directly to R2 — never through API |
| Notify Service | Routes events to correct channel (Push/SMS/Email/WhatsApp) | Fan-out pattern driven by order events |
| BullMQ Workers | Async jobs: payment capture, push dispatch, photo processing | Same Redis instance as Socket.io adapter |
| Neon PostgreSQL | Persistent source of truth for all entities | 15 core tables; Prisma ORM |
| Upstash Redis | Ephemeral: GPS cache, Socket.io adapter, BullMQ queues, rate limits | All short-lived data lives here |
| Cloudflare R2 | Object storage for before/after photos | Presigned URLs; CDN delivery |

---

## Recommended Turborepo Project Structure

```
cleanly/                              # Turborepo root
├── apps/
│   ├── api/                          # Fastify API + Socket.io server
│   │   └── src/
│   │       ├── plugins/              # Fastify plugins (auth, cors, rate-limit)
│   │       ├── routes/               # Route handlers by domain
│   │       │   ├── auth/
│   │       │   ├── orders/
│   │       │   ├── companies/
│   │       │   ├── payments/
│   │       │   └── ...
│   │       ├── services/             # Business logic (order state machine, etc.)
│   │       ├── sockets/              # Socket.io namespace handlers
│   │       ├── workers/              # BullMQ worker definitions
│   │       ├── queues/               # BullMQ queue definitions
│   │       └── lib/                  # Shared utilities (prisma client, redis client)
│   ├── customer-web/                 # Next.js App Router
│   ├── customer-mobile/              # Expo React Native
│   ├── company-web/                  # Vite + React SPA
│   ├── washer-mobile/                # Expo React Native
│   └── admin-web/                    # Next.js App Router
├── packages/
│   ├── db/                           # Prisma schema + generated client + migrations
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── types/                        # Shared TypeScript types + Zod schemas
│   │   ├── order.ts                  # Order states, event types
│   │   ├── auth.ts                   # JWT payload shape per role
│   │   └── api.ts                    # Request/response shapes
│   ├── ui/                           # Shared React components (web only)
│   ├── ui-native/                    # Shared React Native components (mobile)
│   ├── i18n/                         # Translation files (en/ar) + RTL helpers
│   │   ├── locales/en/
│   │   └── locales/ar/
│   └── config/                       # Shared ESLint, TypeScript, Tailwind configs
└── turbo.json
```

### Structure Rationale

- **`packages/db/`:** Centralizes Prisma schema so all apps import from one place. Migrations run from here. Never import Prisma in apps directly — import from `@cleanly/db`.
- **`packages/types/`:** Zod schemas shared between API (validation) and clients (type inference). No duplication of request/response shapes.
- **`packages/i18n/`:** Arabic RTL must be in place from day 1. Centralizing translations prevents drift across 5 surfaces.
- **`apps/api/workers/`:** BullMQ workers live in the API app. For MVP, run in the same process. Split to a separate worker app only under load.
- **`packages/ui-native/` vs `packages/ui/`:** Expo and web cannot share component libraries due to React Native primitives. Keep separate to avoid bundler conflicts.

---

## Architectural Patterns

### Pattern 1: Modular Monolith (not microservices)

**What:** Single Fastify process with internally-separated modules (plugins/services). All services share one DB connection and one Redis connection.

**When to use:** Always for a solo developer at this scale. The consensus in 2025 is that below 10 developers, monoliths decisively win. Microservices add distributed systems complexity (service discovery, network failures, distributed tracing) that provides no benefit for a single developer.

**Trade-offs:**
- Pro: Deploy as one unit, debug in one place, no inter-service networking
- Pro: Shared Prisma transaction scope across services (atomic order + payment updates)
- Con: Cannot scale individual services independently — not a concern for UAE launch scale
- Con: A bug can crash the whole API — mitigated by process supervisor (PM2) and health checks

**Migration path:** When GPS writes become a bottleneck, extract the Location Service to a separate lightweight process first. Everything else stays together for longer than you expect.

---

### Pattern 2: Order State Machine with Explicit Transition Guards

**What:** The order lifecycle is modeled as a finite state machine with 7 states and explicitly permitted transitions. Transition logic lives server-side only — clients request transitions, the server enforces validity.

**States:**
```
pending → accepted → washer_assigned → en_route → arrived → in_progress → completed
                                                                         ↘ disputed
Any state → cancelled (with rules on who can cancel at which state)
```

**When to use:** Any multi-step business flow where invalid state transitions must be prevented (double-capture, skipping steps, racing updates).

**Trade-offs:**
- Pro: Impossible to create invalid order states; prevents payment double-capture
- Pro: Easy to audit — every transition is a DB-written event
- Con: Requires careful design upfront — worth the investment

**Implementation:** Implement as a plain TypeScript class/function in `packages/types/order.ts`, not XState. XState is powerful but adds significant complexity for backend use. A simple transition table is sufficient and easier for a solo builder to reason about.

```typescript
// packages/types/order.ts
export type OrderStatus =
  | 'pending' | 'accepted' | 'washer_assigned' | 'en_route'
  | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:         ['accepted', 'cancelled'],
  accepted:        ['washer_assigned', 'cancelled'],
  washer_assigned: ['en_route', 'cancelled'],
  en_route:        ['arrived'],
  arrived:         ['in_progress'],
  in_progress:     ['completed', 'disputed'],
  completed:       [],
  cancelled:       [],
  disputed:        ['completed', 'cancelled'],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}
```

---

### Pattern 3: GPS Location via Redis Cache + Socket.io Namespaced Broadcast

**What:** Washer app sends GPS coordinates to the API every 3-5 seconds. API writes to Redis key `loc:{washerId}` with a 60-second TTL, then broadcasts to the Socket.io room `order:{orderId}`. Only customers with an active order watching that washer receive updates.

**When to use:** Any real-time location tracking where you need current position (not history) and don't want to write every GPS ping to PostgreSQL.

**Trade-offs:**
- Pro: Redis handles ~100k writes/second; far exceeds any realistic washer fleet size
- Pro: Socket.io rooms ensure only relevant clients receive location updates (not a global broadcast)
- Pro: 60s TTL auto-expires stale locations when washer goes offline
- Con: Location history is not persisted (not needed for MVP — add if dispute resolution requires it)

**Scaling note:** Redis pub/sub via `@socket.io/redis-adapter` allows horizontal scaling of Socket.io across multiple API instances when needed. Upstash Redis supports this natively.

---

### Pattern 4: Presigned URL Photo Upload (client-direct-to-R2)

**What:** API issues a presigned PUT URL for Cloudflare R2. The mobile client uploads the file directly to R2. API is never in the byte transfer path.

**When to use:** Any user-generated media upload. Never proxy file bytes through your API server.

**Trade-offs:**
- Pro: API server is not a bandwidth bottleneck for photo uploads
- Pro: Reduces API server memory pressure significantly
- Con: Requires two-step flow (request URL → upload → confirm to API)

**Flow:**
```
Washer App → POST /api/uploads/presign { orderId, type: 'before' | 'after' }
API        → generate presigned PUT URL (15min expiry) → return { uploadUrl, fileKey }
Washer App → PUT {uploadUrl} with photo bytes (direct to R2)
Washer App → POST /api/uploads/confirm { fileKey }
API        → record fileKey in DB against order
```

---

### Pattern 5: Stripe Connect Destination Charges with Auth + Capture

**What:** When customer pays, Stripe authorizes (holds) the card but does not capture. On order completion, API captures the charge and simultaneously transfers the company's share (minus platform commission) to the company's Stripe Connect account.

**When to use:** Any marketplace where you need to hold funds pending service delivery confirmation.

**Trade-offs:**
- Pro: Customer is never charged if order is cancelled before capture
- Pro: Platform commission is extracted atomically at capture time
- Con: Authorization holds expire after 7 days — must capture or release before then
- Con: Connect onboarding for companies requires KYC completion

**Flow:**
```
Customer → PaymentIntent created (amount=full, capture_method=manual)
Customer → Confirms payment (Stripe Elements) → card authorized
Order completes → API captures PaymentIntent
              → creates Transfer to company Stripe account (amount minus commission)
              → records payout in DB
```

---

### Pattern 6: Multi-Role JWT with Role Claim

**What:** Single JWT structure with a `role` claim (`customer | washer | company | admin`). Each role uses a different authentication method (OTP for customers/washers, email+MFA for companies, Google SSO for admin). All tokens are verified by the same Fastify auth plugin, which then gates routes by role.

**When to use:** Any system with multiple actor types accessing different API surfaces.

```typescript
// JWT payload shape (packages/types/auth.ts)
interface JWTPayload {
  sub: string        // userId
  role: 'customer' | 'washer' | 'company_member' | 'admin'
  companyId?: string // present for company_member role
  iat: number
  exp: number
}
```

Route protection: Fastify `preHandler` hook checks `request.user.role` against allowed roles per route. Company routes additionally verify `request.user.companyId` matches the resource being accessed.

---

## Data Flow

### Critical Flow: Order Booking to Real-Time Tracking

```
Customer selects service → POST /orders
  → DB: creates order (status: pending)
  → Stripe: creates PaymentIntent (authorized, not captured)
  → BullMQ: enqueue "notify_company" job
  → response: { orderId, clientSecret }

Customer pays in-app (Stripe Elements)
  → Stripe webhook: payment_intent.succeeded
  → DB: order.payment_status = authorized

Company accepts order → PATCH /orders/:id/accept
  → State machine: pending → accepted
  → DB: update status
  → Socket.io: emit to customer room `order:{id}` { status: 'accepted' }
  → BullMQ: push notifications to customer

Company assigns washer → PATCH /orders/:id/assign
  → State machine: accepted → washer_assigned
  → Socket.io: emit { status: 'washer_assigned', washerId }

Washer app goes en_route → PATCH /orders/:id/en_route
  → State machine: washer_assigned → en_route
  → Socket.io room for order: broadcast GPS tracking starts

Washer app sends GPS → POST /location/:washerId
  → Redis SET loc:{washerId} {lat, lng} EX 60
  → Socket.io room `order:{orderId}`: emit { lat, lng }  ← customer map updates

Washer marks arrived → in_progress → completed
  → on completed: Stripe PaymentIntent capture
  → Stripe Connect Transfer to company account (minus commission)
  → BullMQ: send receipt email + push notification
  → DB: order.status = completed, payout_status = transferred
```

### Auth Flow by Role

```
Customer/Washer:
  POST /auth/otp/send { phone }   → Twilio SMS
  POST /auth/otp/verify { phone, code } → JWT (role: customer|washer)

Company Member:
  POST /auth/company/login { email, password } → TOTP MFA → JWT (role: company_member, companyId)

Admin:
  GET /auth/google/callback → Google OAuth → JWT (role: admin)
```

### Notification Fan-out

```
Order event occurs (state change)
  → Notify Service determines which actors need notification
  → For each actor:
      Customer? → Expo Push + optional SMS
      Company?  → Expo Push (if mobile) + Email (Resend)
      Washer?   → Expo Push
  → WhatsApp (360dialog) for high-priority events only (order confirmed, washer arriving)
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Server-side PaymentIntent + Stripe Elements on client | Never pass raw card data to API — use client-side Stripe SDK |
| Stripe Connect | Destination charges + Transfer API | Companies must complete KYC before receiving payouts |
| Twilio | REST API for SMS OTP | Rate limit OTP sends to 3/phone/hour |
| Resend | REST API (resend-js SDK) | Transactional only — receipts, onboarding |
| 360dialog | WhatsApp Business API | Template messages only (WhatsApp restriction) |
| Expo Push | Expo Push Notifications API | Batch sends; handle InvalidCredentials to prune tokens |
| Cloudflare R2 | S3-compatible SDK (presigned URLs) | Use `@aws-sdk/client-s3` with R2 endpoint |
| Google SSO | OAuth2 PKCE flow | Admin surface only; `passport-google-oauth20` or `arctic` |
| Neon | Prisma + PgBouncer pooled connection string | Single DATABASE_URL; no direct connection needed post-2024 |
| Upstash Redis | `ioredis` + `@socket.io/redis-adapter` + `bullmq` | All three share one Upstash instance |

### Internal Component Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Route handler ↔ Service | Direct function call (same process) | No HTTP between internal modules |
| Service ↔ DB | Prisma client (from `@cleanly/db`) | Single shared PrismaClient instance |
| Service ↔ Redis | ioredis client (singleton from `lib/redis.ts`) | Same client for BullMQ + Socket.io adapter |
| Order Service ↔ Notify Service | In-process event emitter or direct call | Not a queue — notifications are synchronous side effects |
| API ↔ BullMQ workers | BullMQ Queue (add) / Worker (process) | Both in same process for MVP; workers run in background threads |
| Client apps ↔ API | REST over HTTPS | All requests through `/api/v1/` prefix |
| Client apps ↔ Socket.io | WebSocket (WSS) upgrade on `/socket.io/` path | Auth via JWT in handshake query param |

---

## Suggested Build Order (Dependency Sequence)

Build order is driven by dependencies — later components require earlier ones to exist.

```
Phase 1: Foundation
  1. Turborepo scaffold + shared packages (db, types, config, i18n)
  2. Neon DB + Prisma schema (15 tables) + initial migrations
  3. Upstash Redis setup (connection test)
  4. Fastify skeleton (plugins: cors, jwt, rate-limit, error handler)
  5. Auth routes (OTP, company login, admin Google SSO)
  → Unblocks: Everything else requires auth

Phase 2: Core Business Flow
  6. Company onboarding API (profile, cities, categories, packages)
  7. Company Web app (onboarding UI)
  → Required: at least one real company to test booking

  8. Order API (create, state machine, transitions)
  9. Stripe integration (PaymentIntent, webhook handler, Connect transfer)
  → These are tightly coupled — build together

  10. Customer Web (browse, book, pay)
  → First end-to-end test: customer books, company accepts

Phase 3: Real-Time Layer
  11. Socket.io server (namespaces: orders, tracking)
  12. Location Service (GPS POST endpoint + Redis + broadcast)
  13. Washer Mobile app (GPS tracking, job accept/complete)
  14. Customer Mobile (real-time tracking map)
  → Requires: Phase 2 order flow working first

Phase 4: Supporting Systems
  15. BullMQ workers (notifications, receipt emails)
  16. Notify Service (Expo Push, Twilio, Resend, 360dialog)
  17. Media Service (R2 presigned URLs, photo upload flow)
  18. Before/after photo UI in Washer Mobile + Customer Web

Phase 5: Polish and Operations
  19. Admin Web (company approval, order oversight)
  20. Promo codes, loyalty wallet
  21. Analytics dashboards (company web)
  22. Arabic RTL polish pass across all surfaces
```

**Key dependency rule:** The order state machine must be built before anything that transitions orders (washer app, company dashboard, payment capture). Get state machine correct early — retrofitting it is painful.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 orders/day | Monolith as described. Single Fastify process. This is the UAE launch target. |
| 500-5k orders/day | Add read replicas on Neon. Cache company listings in Redis. Monitor slow queries. |
| 5k-50k orders/day | Extract GPS location service to separate process. Add second API instance behind load balancer + Redis adapter already in place for Socket.io. |
| 50k+ orders/day | Extract notification worker to separate process. Consider Kafka for event backbone. This is post-Series A scale — don't build for it now. |

### Scaling Priorities (what breaks first)

1. **First bottleneck: PostgreSQL connection count.** Fastify is synchronous-friendly but Prisma opens connections. Neon's PgBouncer connection pooling handles this — use the pooled connection string from day 1.
2. **Second bottleneck: Socket.io GPS fan-out.** At 10k+ concurrent active orders, the single Socket.io process saturates. Mitigation: `@socket.io/redis-adapter` already enables horizontal scaling with zero code changes.
3. **Third bottleneck: Notification volume.** High order volume means high SMS/email/push volume. BullMQ rate-limiting per queue solves this — don't fire notifications synchronously.

---

## Anti-Patterns

### Anti-Pattern 1: Microservices from Day 1

**What people do:** Split auth, orders, payments, notifications into separate services with HTTP calls between them.

**Why it's wrong:** For a solo developer, this means managing 6+ deployment units, inter-service authentication, distributed tracing, and network failure handling — before a single customer has paid. The consensus in 2025 is monoliths win below 10 developers.

**Do this instead:** Modular monolith with clear internal boundaries. Extract to separate processes only when a specific bottleneck is measured (never speculative).

---

### Anti-Pattern 2: Writing GPS Coordinates to PostgreSQL on Every Update

**What people do:** Persist every GPS ping (every 4-5s) to the orders or locations table in PostgreSQL.

**Why it's wrong:** At 50 active washers, that's ~10 writes/second. At 500 washers (future scale), that's 100 writes/second for data that's mostly discarded. PostgreSQL is not a time-series store.

**Do this instead:** Write GPS to Redis only (TTL 60s). Persist only significant location events to PostgreSQL (job started, arrived, completed). If full GPS history is needed (dispute resolution), add a time-series store (TimescaleDB extension on Neon) only when the need is validated.

---

### Anti-Pattern 3: Processing File Uploads Through the API Server

**What people do:** POST photo bytes to `/api/orders/:id/photos` and proxy them to R2 from the server.

**Why it's wrong:** Blocks the Node.js event loop during large file transfers. A 5MB photo takes 200-500ms through the server. With concurrent uploads from multiple washers, this saturates the API.

**Do this instead:** Presigned URL pattern (Pattern 4 above). Client uploads directly to R2. API only issues the URL and records the confirmed key.

---

### Anti-Pattern 4: Single JWT for All Roles Without Role Enforcement at Route Level

**What people do:** Check `request.user` exists but not `request.user.role` on protected routes.

**Why it's wrong:** A customer JWT could call company management endpoints. A washer could access admin functions.

**Do this instead:** Every protected route declares its allowed roles explicitly. A Fastify `preHandler` hook enforces role. Additionally, company routes verify `companyId` ownership — a company member of Company A cannot manage Company B's orders.

---

### Anti-Pattern 5: Building RTL as an Afterthought

**What people do:** Build the full UI in English first, then add RTL/Arabic translations later.

**Why it's wrong:** RTL layout requires `dir="rtl"` on root elements, mirrored flexbox directions, mirrored icon orientations, different font stacks, and bidirectional text handling in mixed-language strings. Retrofitting this across 5 surfaces after the fact is extremely painful — the Cleanly PROJECT.md explicitly flags this risk.

**Do this instead:** Set up `i18n` package with English + Arabic from the first UI component. Use a library like `react-i18next` with RTL-aware Tailwind config. Test Arabic layout at every phase, not just at the end.

---

## Sources

- Stripe Connect documentation: https://docs.stripe.com/connect
- Stripe Connect charges overview: https://docs.stripe.com/connect/charges
- Production Stripe Connect flow for marketplaces (Jan 2026): https://medium.com/@silverskytechnology/designing-a-production-ready-stripe-connect-payment-flow-for-marketplaces-2dcd538dfeba
- Scaling Socket.IO with Redis adapters: https://medium.com/@connect.hashblock/scaling-socket-io-redis-adapters-and-namespace-partitioning-for-100k-connections-afd01c6938e7
- Ably: Scaling Socket.IO real-world challenges: https://ably.com/topic/scaling-socketio
- Real-time order tracking with event-driven architecture (Airtel Digital): https://medium.com/airteldigital/how-we-built-a-real-time-order-tracking-system-using-event-driven-architecture-c63abd114e31
- Turborepo + PNPM for Next.js + React Native monorepo (2025): https://medium.com/@TheblogStacker/2025-monorepo-that-actually-scales-turborepo-pnpm-for-next-js-ab4492fbde2a
- Turborepo with React Native and Next.js production guide (2025): https://medium.com/better-dev-nextjs-react/setting-up-turborepo-with-react-native-and-next-js-the-2025-production-guide-690478ad75af
- Neon + Prisma connection pooling: https://neon.com/docs/guides/prisma
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- High-scale file upload designs with R2 and signed URLs: https://medium.com/@ThinkingLoop/9-high-scale-file-upload-designs-with-s3-r2-and-signed-urls-ad1425ee85e8
- Uber/Lyft system design — GPS + geolocation service: https://medium.com/@lazygeek78/system-design-of-uber-lyft-549963c816b4
- Monolith vs microservices decision framework 2025: https://medium.com/@kittikawin_ball/microservices-vs-monoliths-architecture-decision-framework-for-2025-98c8ff2ec484
- BullMQ documentation: https://docs.bullmq.io/

---

*Architecture research for: On-demand cleaning services marketplace (Cleanly)*
*Researched: 2026-03-30*
