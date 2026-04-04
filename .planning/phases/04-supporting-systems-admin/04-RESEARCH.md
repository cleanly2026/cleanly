# Phase 4: Supporting Systems & Admin - Research

**Researched:** 2026-04-05
**Domain:** Multi-channel notifications (Expo Push / Twilio SMS / 360dialog WhatsApp / Resend email), Admin panel (Next.js), Dispute management, Audit logging, Private beta readiness
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full lifecycle coverage — all order state transitions trigger notifications. Events include: order confirmed, washer assigned, washer en route, washer arrived, service in progress, service completed, refund issued, carpet picked up, carpet ready for return, carpet out for delivery, carpet returned. ~10 customer-facing events.
- **D-02:** Tiered channel approach per event importance:
  - **Push notifications (Expo Push):** All events — always sent.
  - **SMS (Twilio) + WhatsApp (360dialog):** Critical events only — order confirmed, washer en route, service completed, refund issued.
  - **Email (Resend):** Receipt/invoice only — sent after order completion.
- **D-03:** WhatsApp templates designed and submitted for Meta approval during development. Bilingual templates (AR + EN) for each critical event. 360dialog account setup and template submission happens in parallel with code development.
- **D-04:** Both customers AND washers receive notifications. Washer notifications: new job assignment, job cancelled by customer, schedule changes. Push-only for washers (no SMS/WhatsApp/email for washers).
- **D-05:** All notifications sent in the recipient's preferred language (stored in user profile). BullMQ `notificationQueue` (already scaffolded) processes all notification jobs.
- **D-06:** Sidebar navigation — fixed left sidebar with sections: Dashboard, Companies, Orders, Disputes, Cities/Categories, Audit Log. Collapsible on mobile. Standard admin panel pattern.
- **D-07:** Dashboard landing page shows essential metrics only: today's orders, active washers, pending company reviews, open disputes. 4 stat cards + recent orders table.
- **D-08:** Company review workflow: admin clicks pending company → full detail page (name, documents, cities, categories, Stripe Connect status) → approve or reject with reason field. Rejection reason sent to company via notification.
- **D-09:** Audit log: simple action + timestamp + admin user table. Filterable by action type and admin user. No before/after diff logging for beta.
- **D-10:** Dispute is customer-initiated in-app. Customer taps "Report issue" on a completed order, selects a reason, optionally adds a note.
- **D-11:** Admin dispute view: side-by-side photo viewer showing before and after photos, plus order details.
- **D-12:** Admin can issue full refund or partial refund (custom amount + reason). Stripe refund API already implemented in `stripe.service.ts`.
- **D-13:** Refund triggers: reverse Stripe transfer before issuing customer refund. Audit log records refund action.
- **D-14:** Beta priority: customer web + mobile and washer mobile rock-solid; company/admin panel functional but polish acceptable.
- **D-15:** Full seed script for beta testing: 3 demo companies, sample orders in various states.
- **D-16:** Manual test checklist (not automated E2E).
- **D-17:** Polish pass: error boundaries, loading skeletons, empty states across all screens.

### Claude's Discretion

- Notification template text/copy for each event and channel
- BullMQ worker architecture for notification dispatch (single worker or per-channel workers)
- Admin panel component library choice (reuse shadcn/ui from customer-web or admin-specific)
- Dispute reason categories/enum values
- Seed data specifics (company names, package details, pricing)
- Error boundary implementation pattern across surfaces
- Manual test checklist structure and coverage
- City/category management CRUD in admin panel

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTF-01 | Push notification sent on key order status changes (Expo Push) | expo-server-sdk 6.1.0 installed; notification.worker.ts scaffolded — needs channel dispatch logic |
| NOTF-02 | SMS sent for order confirmation and washer arrival (Twilio) | twilio 5.13.1 already installed in apps/api — needs client.messages.create() calls |
| NOTF-03 | WhatsApp notification for order confirmation (360dialog) | No SDK — use fetch/axios to waba-v2.360dialog.io with D360-API-KEY header; template pre-approval required |
| NOTF-04 | Email receipt sent after order completion (Resend) | resend 3.x NOT yet installed; react-email template pattern documented |
| NOTF-05 | All notifications in customer's preferred language | User.preferred_language already in Prisma schema; i18n strings in packages/i18n/locales/ |
| ADM-01 | Admin can review and verify/reject company applications | Company.is_verified field exists; needs API route + admin-web UI page |
| ADM-02 | Admin can view platform-wide order list and details | Order model complete; needs admin API route + admin-web page |
| ADM-03 | Admin can manage cities and service categories | City model exists; needs CRUD API + admin-web page |
| ADM-04 | Admin can handle disputes with photo evidence viewer | Dispute model NOT in schema yet — needs migration; R2 presigned GET URLs for photo viewer |
| ADM-05 | Admin can issue manual refunds | createRefund() already in stripe.service.ts; needs admin UI + partial refund support |
| ADM-06 | Admin can view audit log of all admin actions | AuditLog model already in schema; needs API write calls + admin-web list page |
</phase_requirements>

---

## Summary

Phase 4 completes the Cleanly platform's operational backbone: multi-channel notifications that keep customers and washers informed at every lifecycle event, an admin panel for company review and dispute resolution, and a seed + polish pass for private beta readiness.

The notification architecture is already stubbed — `notificationQueue` exists in `apps/api/src/queues/queues.ts`, `notification.worker.ts` exists with idempotency scaffolding but dispatches nothing yet. The worker needs to fan out each job to the appropriate channels based on `job.name` (push, SMS, WhatsApp, email), delegating to service files per channel. Twilio (5.13.1) is already installed. `resend` and `expo-server-sdk` are NOT yet installed and must be added. 360dialog has no Node.js SDK — use raw HTTP with the D360-API-KEY header to `https://waba-v2.360dialog.io/messages`.

The admin panel (`apps/admin-web/`) has Google SSO and locale routing fully working from Phase 1. It currently only has auth pages — no admin feature pages exist yet. The sidebar, dashboard metrics, company review, dispute management, refund UI, city/category CRUD, and audit log all need to be built. The `AuditLog` Prisma model exists. A `Dispute` model does NOT exist and requires a schema migration before any dispute features can be built.

**Primary recommendation:** Build in this order: (1) Prisma migration for Dispute model, (2) notification service files + wire worker dispatch, (3) admin API routes, (4) admin-web pages following the existing `[locale]` + next-intl pattern established in customer-web.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `twilio` | 5.13.1 | SMS via client.messages.create() | Installed in apps/api |
| `bullmq` | 5.71.1 | Notification job queue | Installed, queue + worker scaffolded |
| `stripe` | 21.0.1 | Refund API (createRefund already implemented) | Installed |
| `next-intl` | (in customer-web/admin-web) | i18n for Next.js apps | Wired with `[locale]` routing |
| `shadcn/ui` | latest | Admin panel components via packages/ui | In packages/ui |
| `@socket.io/redis-adapter` | 8.3.0 | Real-time admin dashboard updates | Installed |

### Must Install
| Library | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| `resend` | 3.x (3.5.0 current via npm) | Transactional email | `pnpm add resend --filter @cleanly/api` |
| `expo-server-sdk` | 6.1.0 | Expo Push Notifications server-side | `pnpm add expo-server-sdk --filter @cleanly/api` |
| `@react-email/components` | 1.x | Email template components | `pnpm add @react-email/components --filter @cleanly/api` |

### 360dialog: No SDK — Raw HTTP
360dialog does not publish a Node.js SDK on npm. The correct pattern is direct HTTP using the native `fetch` API (Node 18+ native, available in Node 24 runtime):

```typescript
// POST https://waba-v2.360dialog.io/messages
// Header: D360-API-KEY: {api_key}
// Header: Content-Type: application/json
```

**Version verification (run before implementing):**
```bash
npm view resend version          # 3.5.0 as of 2026-04-05
npm view expo-server-sdk version # 6.1.0 as of 2026-04-05
npm view @react-email/components version # 1.0.11 as of 2026-04-05
```

---

## Architecture Patterns

### Notification Worker Architecture (Claude's Discretion)

**Recommendation: Single worker, job-name-based dispatch.** The existing `notification.worker.ts` follows the `order.worker.ts` pattern with `switch (job.name)`. Extend this same pattern rather than creating 4 separate per-channel workers. This keeps the worker process count low (solo dev, Railway budget), leverages the existing idempotency key pattern, and matches the established codebase pattern.

Each notification job dispatched to the `notificationQueue` uses a structured `job.name`:

```
send-push            → Expo Push
send-sms             → Twilio client.messages.create()
send-whatsapp        → 360dialog HTTP POST
send-email-receipt   → Resend
```

Jobs are dispatched from order lifecycle route handlers (after each `transitionOrderStatus` call) and from admin refund route handlers. The existing `orderLifecycleRoutes` in `apps/api/src/routes/orders/lifecycle.ts` is the primary dispatch point.

### Notification Dispatch Pattern

```typescript
// Source: established BullMQ pattern in order.worker.ts
// Dispatch from lifecycle route handler after state transition:
await notificationQueue.add('send-push', {
  userId: order.customer_id,
  event: 'washer_en_route',
  orderId: order.id,
  language: customer.preferred_language,  // 'en' | 'ar'
  data: { etaMinutes: 15 }
})

// For critical events, also add SMS and WhatsApp jobs:
await notificationQueue.add('send-sms', { ... })
await notificationQueue.add('send-whatsapp', { ... })
```

**Idempotency key pattern** (already established in notification.worker.ts):
```typescript
const alreadySent = await redis.get(`job:sent:${job.id}`)
if (alreadySent) return { skipped: true }
// ... dispatch ...
await redis.set(`job:sent:${job.id}`, '1', 'EX', 7 * 24 * 60 * 60)
```

### Notification Service Files

Create one service file per channel in `apps/api/src/services/`:
- `push.service.ts` — Expo push via expo-server-sdk
- `sms.service.ts` — Twilio SMS
- `whatsapp.service.ts` — 360dialog HTTP
- `email.service.ts` — Resend + react-email templates

### Expo Push Service Pattern

```typescript
// Source: expo-server-sdk README / docs.expo.dev
import { Expo } from 'expo-server-sdk'

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })

export async function sendPushNotification(params: {
  pushToken: string
  title: string
  body: string
  data?: Record<string, unknown>
}) {
  if (!Expo.isExpoPushToken(params.pushToken)) {
    console.warn('[Push] Invalid push token:', params.pushToken)
    return
  }
  const messages = [{ to: params.pushToken, title: params.title, body: params.body, data: params.data }]
  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk)
  }
}
```

**Push token storage:** The `User` model currently has no `expo_push_token` field. A schema migration is required to add `expo_push_token String?` to the `User` model. Mobile apps must call a PATCH `/users/push-token` endpoint on app launch to register/update the token.

### Twilio SMS Pattern

```typescript
// Source: Twilio Node.js official docs
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export async function sendSms(to: string, body: string) {
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,   // E.164 format: +971XXXXXXXX
  })
}
```

Note: Twilio (5.13.1) is already installed. Environment variables `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` need to be added to `.env`.

### 360dialog WhatsApp Template Pattern

```typescript
// Source: docs.360dialog.com — no SDK, raw HTTP
export async function sendWhatsAppTemplate(params: {
  to: string           // E.164 format
  templateName: string // pre-approved Meta template name
  language: 'en' | 'ar'
  components?: unknown[]
}) {
  const res = await fetch('https://waba-v2.360dialog.io/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': process.env.DIALOG360_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.language === 'ar' ? 'ar' : 'en_US' },
        components: params.components ?? [],
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[360dialog] ${res.status}: ${err}`)
  }
}
```

**CRITICAL: Template pre-approval lead time is 1-2 weeks.** Billing model: flat monthly fee per WABA number ($50/month), no per-message markup. New environment variable: `DIALOG360_API_KEY`.

### Resend Email Pattern

```typescript
// Source: resend.com/nodejs official docs
import { Resend } from 'resend'
import { OrderReceiptEmail } from '../emails/order-receipt.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderReceipt(params: {
  to: string
  orderId: string
  language: 'en' | 'ar'
  // ... order details
}) {
  await resend.emails.send({
    from: 'Cleanly <receipts@cleanly.ae>',
    to: params.to,
    subject: params.language === 'ar' ? 'إيصال طلبك' : 'Your Order Receipt',
    react: OrderReceiptEmail({ orderId: params.orderId, language: params.language }),
  })
}
```

Email templates live in `apps/api/src/emails/` as React components using `@react-email/components`. New environment variable: `RESEND_API_KEY`.

### Admin Panel Structure (follows established customer-web pattern)

The existing `apps/admin-web/` already has:
- `app/[locale]/layout.tsx` — locale-aware layout with Cairo font, RTL dir attribute
- `app/[locale]/auth/signin/` — Google SSO page
- `middleware.ts` — intlMiddleware chained with auth.js guard
- `src/i18n/routing.ts` — `localePrefix: 'always'`

New pages follow the same `app/[locale]/` convention:

```
apps/admin-web/app/[locale]/
├── layout.tsx              # existing — add sidebar shell here
├── page.tsx                # dashboard metrics (4 stat cards + recent orders)
├── companies/
│   ├── page.tsx            # company list (pending + all)
│   └── [id]/page.tsx       # company detail + approve/reject
├── orders/
│   ├── page.tsx            # platform-wide order list
│   └── [id]/page.tsx       # order detail
├── disputes/
│   ├── page.tsx            # dispute list
│   └── [id]/page.tsx       # side-by-side photo viewer + refund action
├── cities/
│   └── page.tsx            # city + category CRUD
└── audit-log/
    └── page.tsx            # audit log with filters
```

### Sidebar Component Pattern

shadcn/ui ships a `Sidebar` component (added late 2024). Use `npx shadcn add sidebar` to install it into `packages/ui`. The Sidebar component provides:
- Collapsible on mobile (sheet fallback)
- Persistent state via cookies
- Keyboard shortcuts

```typescript
// packages/ui/src/sidebar.tsx — after shadcn add sidebar
// apps/admin-web/src/components/admin-sidebar.tsx — nav items config
```

### Admin API Routes

New Fastify route files in `apps/api/src/routes/admin/`:
- `companies.ts` — GET list, PATCH /:id/verify, PATCH /:id/reject
- `orders.ts` — GET list (with filters), GET /:id
- `disputes.ts` — GET list, GET /:id, POST /:id/resolve
- `cities.ts` — GET/POST/PATCH/DELETE
- `audit-log.ts` — GET list with filters

All admin routes use `preHandler: [fastify.authenticate]` plus an admin role check middleware:

```typescript
// apps/api/src/plugins/admin-guard.ts (new)
import fp from 'fastify-plugin'
import type { FastifyRequest, FastifyReply } from 'fastify'

export default fp(async (fastify) => {
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
  })
})
```

**Register in server.ts** and use as: `preHandler: [fastify.authenticate, fastify.requireAdmin]`

### R2 Photo Viewer in Admin Dispute Page

The existing `r2.ts` only generates presigned PUT URLs (for washer uploads). For the admin dispute viewer, add a `getSignedReadUrl()` function using `GetObjectCommand` from `@aws-sdk/client-s3`:

```typescript
// apps/api/src/lib/r2.ts — add:
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function getSignedReadUrl(key: string, expiresIn = 900): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(client, command, { expiresIn })
}
```

Admin dispute API route calls `getSignedReadUrl(order.before_photo_url)` and `getSignedReadUrl(order.after_photo_url)` before returning to the frontend.

### Partial Refund Support

The existing `createRefund()` in `stripe.service.ts` issues a full refund (no `amount` parameter). For admin partial refunds, add an overloaded variant:

```typescript
// stripe.service.ts — add:
export async function createPartialRefund(
  paymentIntentId: string,
  amountFils: number,  // partial amount in fils (AED smallest unit)
  reason?: string
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountFils,
    reason: (reason as Stripe.RefundCreateParams.Reason) ?? 'requested_by_customer',
    reverse_transfer: true,
    refund_application_fee: false,  // partial refunds don't refund application fee
  })
}
```

Note: `reverse_transfer: true` on partial refunds reverses the **entire transfer** to the company, then Stripe re-transfers the difference. Verify this behavior in Stripe dashboard for UAE Connect accounts before relying on it.

### Audit Log Write Pattern

Every admin action writes to the `AuditLog` table:

```typescript
// Pattern: call after successful action
await prisma.auditLog.create({
  data: {
    admin_id: request.user.sub,  // JWT sub is the admin user ID
    action: 'company.verify',    // enum-style string
    entity: 'Company',
    entity_id: companyId,
    metadata: { reason: '' },    // optional context
  }
})
```

`AuditLog` model already exists in schema.prisma — no migration needed for the log itself.

### Prisma Schema Migration Required

Two additions needed before Phase 4 can be implemented:

**1. Dispute model (ADM-04 — does NOT exist in current schema):**

```prisma
model Dispute {
  id          String   @id @default(cuid())
  order_id    String   @unique
  customer_id String
  reason      String   // enum-style: 'quality_issue' | 'damage' | 'no_show' | 'other'
  note        String?  @db.Text
  status      String   @default("open")  // 'open' | 'resolved' | 'rejected'
  resolution  String?  @db.Text
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  order       Order    @relation(fields: [order_id], references: [id])
  customer    User     @relation("CustomerDisputes", fields: [customer_id], references: [id])

  @@index([status])
  @@index([customer_id])
}
```

**2. Push token field on User (NOTF-01 — expo_push_token not in current schema):**

```prisma
// Add to User model:
expo_push_token  String?   // NOTF-01: Expo push token for mobile notifications
```

Run `pnpm prisma migrate dev --name "add-dispute-and-push-token"` from `packages/db/`.

**Note:** Also add the `Dispute` relation to the `User` model and `Order` model in schema.prisma.

### Notification Event Map

| Order Event | Push | SMS | WhatsApp | Email |
|------------|------|-----|----------|-------|
| order confirmed (pending → accepted) | YES | YES | YES | NO |
| washer assigned | YES | NO | NO | NO |
| washer en route | YES | YES | YES | NO |
| washer arrived (in_progress) | YES | NO | NO | NO |
| service completed | YES | YES | YES | YES (receipt) |
| refund issued | YES | YES | YES | NO |
| carpet picked up | YES | NO | NO | NO |
| carpet ready for return | YES | YES | YES | NO |
| carpet out for delivery | YES | NO | NO | NO |
| carpet returned (completed) | YES | YES | YES | YES (receipt) |
| washer: new job assigned | YES | NO | NO | NO |
| washer: job cancelled | YES | NO | NO | NO |

### i18n String Strategy for Notifications

Notification text is NOT in `packages/i18n/locales/*.json` (those are UI strings). Notification copy lives in the notification service files themselves, keyed by `(event, language)`:

```typescript
// apps/api/src/services/notification-copy.ts
export const NOTIFICATION_COPY = {
  en: {
    order_confirmed: { title: 'Order Confirmed', body: 'Your booking is confirmed. A washer will be assigned shortly.' },
    washer_en_route: { title: 'Washer On The Way', body: 'Your washer is heading to you now.' },
    // ...
  },
  ar: {
    order_confirmed: { title: 'تم تأكيد الطلب', body: 'تم تأكيد حجزك. سيتم تعيين عامل قريباً.' },
    washer_en_route: { title: 'العامل في الطريق', body: 'عامل التنظيف في طريقه إليك الآن.' },
    // ...
  }
}
```

### Seed Script Structure

Location: `packages/db/seed.ts` (or `apps/api/src/seed.ts` if it needs Fastify env).

```typescript
// Seed strategy (D-15):
// 3 demo companies (Dubai, Abu Dhabi, Sharjah)
//   Each: 1 admin user, 2 washers, packages for car_wash + sofa
//   One also has carpet cleaning
// 1 test customer (phone: +971500000001)
// Orders in states: pending, washer_en_route, completed, disputed
// Run: npx tsx packages/db/seed.ts
```

### Error Boundary Pattern (D-17)

React error boundaries for Next.js App Router use `error.tsx` files at each route segment:

```typescript
// apps/customer-web/app/[locale]/error.tsx (and same in admin-web)
'use client'
export default function ErrorBoundary({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="...">
      <p>{/* translated error message */}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

For React Native (washer + customer mobile), use class-based `React.Component` with `componentDidCatch`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification batching/chunking | Custom batch logic | `expo.chunkPushNotifications()` in expo-server-sdk | Handles 100-message chunks, gzip, rate limiting automatically |
| Push token validation | Regex or format check | `Expo.isExpoPushToken()` | Official validator — prevents sending to invalid tokens |
| WhatsApp HTTP client | axios or node-fetch wrapper | Native `fetch` (Node 24 built-in) | No additional dependency needed; Node 24 has stable fetch |
| Email HTML rendering | Custom HTML templating | `@react-email/components` + `resend` react prop | React Email handles responsive, RTL-compatible email HTML |
| Audit log service | Custom audit class | Direct `prisma.auditLog.create()` calls | AuditLog model already in schema; no abstraction layer needed at this scale |
| Sidebar from scratch | Custom drawer/nav | `shadcn sidebar` component | Ships keyboard shortcuts, mobile sheet, cookie persistence |
| Admin auth guard | Copy-paste from auth plugin | `fastify.requireAdmin` decorator via plugin | Consistent with existing `fastify.authenticate` pattern |

---

## Common Pitfalls

### Pitfall 1: Missing Expo Push Token on User Model
**What goes wrong:** Notification worker tries to send push but has no token stored — silently skips all push notifications.
**Why it happens:** `expo_push_token` field doesn't exist in the current Prisma schema — it must be added via migration.
**How to avoid:** Wave 0 task: add migration for `User.expo_push_token` + PATCH endpoint + mobile app calls on launch.
**Warning signs:** `Expo.isExpoPushToken()` returns false for all tokens if the field was never populated.

### Pitfall 2: notificationQueue vs orderQueue Naming Confusion
**What goes wrong:** Worker registered against `'orders'` but queue in `queues.ts` is named `'notifications'` — jobs enqueued to `notificationQueue` are never processed.
**Why it happens:** There are TWO queue files: `lib/queue.ts` (exports `orderQueue` as `'orders'`) and `queues/queues.ts` (exports `notificationQueue` as `'notifications'` AND `orderQueue` as `'order-lifecycle'`). The worker in `workers/order.worker.ts` uses the `lib/queue.ts` version. **This naming divergence is a pre-existing inconsistency in the codebase that must be confirmed before implementing.**
**How to avoid:** Confirm: notification.worker.ts uses queue name `'notifications'` matching `queues/queues.ts`. Order worker uses `lib/queue.ts` queue `'orders'`.
**Warning signs:** Jobs pile up in BullMQ dashboard with no consumers.

### Pitfall 3: 360dialog Template Pre-Approval Blocking Development
**What goes wrong:** WhatsApp channel cannot be tested end-to-end until Meta approves templates (1-2 week wait).
**Why it happens:** Meta requires template pre-approval before any template message can be sent to real numbers.
**How to avoid:** Submit templates on Day 1 of the phase. The STATE.md decision "Start 360dialog WhatsApp template approval now" was flagged pre-Phase 1 and may still not be done. Code the integration immediately and mock WhatsApp during development; activate when templates are approved.
**Warning signs:** 360dialog API returns 400 with "template not approved" error.

### Pitfall 4: Partial Refund Reversing Full Transfer
**What goes wrong:** `reverse_transfer: true` on a partial refund reverses the ENTIRE Stripe transfer to the company, not just the partial amount.
**Why it happens:** Stripe's behavior for partial refunds with `reverse_transfer: true` reverses the full transfer, then re-transfers the remaining amount. This can confuse company payouts.
**How to avoid:** For partial refunds, test in Stripe test mode first. Consider `reverse_transfer: false` for partial refunds and handle the transfer reversal manually only when needed. Document the actual behavior found in test.
**Warning signs:** Company Stripe dashboard shows transfer reversal for full amount even after partial refund.

### Pitfall 5: Admin Routes Without Role Guard
**What goes wrong:** `fastify.authenticate` only verifies JWT — it does NOT check `role === 'admin'`. A customer or washer JWT could access admin routes.
**Why it happens:** The existing auth plugin decodes any valid JWT, not just admin JWTs.
**How to avoid:** ALL admin routes must use `preHandler: [fastify.authenticate, fastify.requireAdmin]` — the admin guard plugin must be implemented in Wave 0 before any admin routes are created.
**Warning signs:** Admin endpoints return 200 for customer JWT tokens in testing.

### Pitfall 6: R2 Key vs Public URL Confusion in Dispute Viewer
**What goes wrong:** `before_photo_url` and `after_photo_url` fields in the Order model store R2 public URLs (from `getPublicUrl()`), not R2 keys. Calling `getSignedReadUrl(order.before_photo_url)` with a public URL will fail.
**Why it happens:** The `buildPhotoKey()` and `getPublicUrl()` functions return different formats. The DB column may store either depending on implementation.
**How to avoid:** Confirm what format is stored in the DB. If public URLs are stored (current code in `getPublicUrl()` returns full URL), the admin viewer can use public URLs directly. If keys are stored, use `getSignedReadUrl()`. Check the photo confirm route handler to determine which value is written to DB.
**Warning signs:** Presigned URL generation throws "invalid key" or returns 403.

### Pitfall 7: next-intl Async Params in Next.js 16
**What goes wrong:** Admin page component throws "params should be awaited" if `params` is used synchronously.
**Why it happens:** Next.js 16 made `params` a Promise in Server Components (established in Phase 1, layout.tsx already handles this correctly with `await params`).
**How to avoid:** Every new `page.tsx` that uses `params` must `const { locale, id } = await params`. The admin-web `layout.tsx` already demonstrates this pattern correctly.
**Warning signs:** Type error "Property 'locale' does not exist on type Promise".

---

## Code Examples

### BullMQ Dispatch from Lifecycle Route (verified pattern from codebase)

```typescript
// Source: established pattern from apps/api/src/routes/orders/lifecycle.ts
// After successful state transition, dispatch notification jobs:
const customer = await prisma.user.findUniqueOrThrow({
  where: { id: order.customer_id },
  select: { expo_push_token: true, phone: true, preferred_language: true }
})

// Push always (all events)
if (customer.expo_push_token) {
  await notificationQueue.add('send-push', {
    pushToken: customer.expo_push_token,
    event: targetStatus,
    orderId,
    language: customer.preferred_language,
  })
}

// SMS + WhatsApp for critical events only (D-02)
if (['accepted', 'washer_en_route', 'completed'].includes(targetStatus)) {
  if (customer.phone) {
    await notificationQueue.add('send-sms', { phone: customer.phone, event: targetStatus, language: customer.preferred_language })
    await notificationQueue.add('send-whatsapp', { phone: customer.phone, event: targetStatus, language: customer.preferred_language })
  }
}

// Email receipt on completion only
if (targetStatus === 'completed' || targetStatus === 'returned') {
  // Only customers with email (optional field)
  if (customer.email) {
    await notificationQueue.add('send-email-receipt', { email: customer.email, orderId, language: customer.preferred_language })
  }
}
```

### Audit Log Write (verified from schema.prisma)

```typescript
// Source: apps/packages/db/schema.prisma — AuditLog model
await prisma.auditLog.create({
  data: {
    admin_id: request.user.sub,
    action: 'company.verify',
    entity: 'Company',
    entity_id: companyId,
    metadata: { approved: true },
  }
})
```

### Admin Guard Decorator (new, follows existing auth plugin pattern)

```typescript
// Source: existing apps/api/src/plugins/auth.ts pattern
import fp from 'fastify-plugin'
import type { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export default fp(async (fastify) => {
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual WhatsApp Business API integration | 360dialog direct-access Cloud API (waba-v2.360dialog.io) | 2023-2024 | Direct Meta API access — lower per-message cost, flat fee model |
| Sendgrid for transactional email | Resend + React Email | 2022-2024 | React JSX templates, permanent free tier 3K/month, superior DX |
| FCM/APNS direct integration | Expo Push Service abstraction | SDK 52+ | Unified token format, handles FCM/APNS routing transparently |
| Custom sidebar components | shadcn/ui `sidebar` component | Late 2024 | Cookie-persisted state, mobile sheet, zero custom CSS needed |
| Express + custom auth | Fastify + `@fastify/jwt` decorators | Established in Phase 1 | Matches codebase pattern; `fastify.decorate()` for guards |

**Deprecated/outdated in this context:**
- `nodemailer`: Do not use — Resend provides superior DX and free tier without SMTP configuration
- `firebase-admin` for push: Expo Push Service abstracts FCM/APNS — don't add Firebase Admin SDK
- `axios` for 360dialog HTTP: Node 24 native `fetch` is sufficient and avoids an extra dependency

---

## Open Questions

1. **Photo URL format in Order DB fields**
   - What we know: `before_photo_url`, `after_photo_url` in `Order` model store string values
   - What's unclear: Phase 3 photo confirm route writes `getPublicUrl(key)` (full URL) or just the R2 `key` — need to confirm which is stored
   - Recommendation: Read `apps/api/src/routes/orders/photos.ts` before implementing dispute viewer. If full public URL is stored, admin viewer can use it directly without presigned URL generation.

2. **360dialog template approval status**
   - What we know: STATE.md flags this as a pre-Phase 1 action item with 1-2 week lead time
   - What's unclear: Whether the 360dialog account was actually created and templates submitted
   - Recommendation: Confirm with user on Day 1. If not done, code integration immediately and use mock in development; WhatsApp channel will activate when approved.

3. **Customer email field**
   - What we know: `User.email` is optional (String?) in the Prisma schema; customers auth via phone OTP, not email
   - What's unclear: Do customers ever provide an email? Is there a UI for optional email capture?
   - Recommendation: Email receipt (NOTF-04) should be conditional on `customer.email` being non-null. A Phase 4 UI enhancement could add optional email to customer profile, but it's not required for NOTF-04 to be implemented — it just won't fire for email-less customers.

4. **Expo Push Token delivery mechanism**
   - What we know: Mobile apps need to call an API endpoint to register their push token
   - What's unclear: Customer mobile and washer mobile apps need a `useEffect` on mount to call `POST /users/push-token` — this endpoint doesn't exist yet and mobile app changes are needed
   - Recommendation: Plan a Wave 0 task for the push token registration endpoint AND matching mobile app calls in both `apps/mobile-customer` and `apps/mobile-washer`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All API services | Yes | v24.14.0 | — |
| `twilio` npm package | NOTF-02 SMS | Yes | 5.13.1 (in apps/api) | — |
| `resend` npm package | NOTF-04 email | No | Not installed | Install: `pnpm add resend` |
| `expo-server-sdk` npm package | NOTF-01 push | No | Not installed | Install: `pnpm add expo-server-sdk` |
| `@react-email/components` | NOTF-04 email templates | No | Not installed | Install: `pnpm add @react-email/components` |
| 360dialog account + API key | NOTF-03 WhatsApp | Unknown | — | Mock in dev; activate on template approval |
| Expo Push access token | NOTF-01 | Unknown | — | Works without token but rate limited |
| Resend API key | NOTF-04 | Unknown | — | Required; sign up at resend.com (free tier) |
| shadcn sidebar component | ADM-06 panel UI | No (not yet installed) | — | `npx shadcn add sidebar` |

**Missing dependencies with no fallback:**
- `resend` — must be installed before email service can be written
- `expo-server-sdk` — must be installed before push service can be written

**Missing dependencies with fallback:**
- `@react-email/components` — can use plain HTML strings in Resend if needed, but React Email is strongly preferred
- 360dialog account — code integration first, use mock/logging during development until template approval

---

## Project Constraints (from CLAUDE.md)

These directives from CLAUDE.md apply to all Phase 4 implementation:

1. **Stitch UI workflow**: Any new screens must go through `/enhance-prompt` → `/stitch-loop` → `/react-components` workflow.
2. **shadcn Stitch implementation**: Uses `/shadcn-ui` skill + glassmorphism registry + Motion Primitives.
3. **No Express**: Fastify only for all API routes.
4. **Phone encryption**: Encrypted phone numbers required for security.
5. **Signed R2 URLs**: All photo access must use signed URLs — never serve R2 objects directly.
6. **RTL from day 1**: All new UI uses `ms-`/`me-`/`ps-`/`pe-` Tailwind logical properties; no left/right.
7. **Bilingual**: All UI strings via i18n keys — no hardcoded English.
8. **`marginStart`/`marginEnd`** in React Native: Never `marginLeft`/`marginRight`.
9. **Upstash Redis Fixed Plan**: Already confirmed in Phase 1 — do not change.
10. **`@prisma/adapter-neon`**: Always use Neon adapter — already wired in `lib/prisma.ts`.
11. **`fastify-raw-body` v5**: Not `@fastify/rawbody` (doesn't exist on npm).
12. **`fastify-type-provider-zod`**: Not `@fastify/type-provider-zod` (doesn't exist on npm).
13. **GSD workflow**: All file changes go through a GSD command — no direct edits outside workflow.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `apps/api/src/queues/queues.ts`, `notification.worker.ts`, `order.worker.ts`, `stripe.service.ts`, `r2.ts`, `socket.ts`, `server.ts`, `plugins/auth.ts`
- `packages/db/schema.prisma` — confirmed AuditLog exists, Dispute does NOT exist
- `packages/i18n/locales/en.json` — confirmed notification copy is NOT in i18n files
- `apps/admin-web/` — confirmed auth, locale routing, and layout established; no admin pages yet
- `apps/api/package.json` — confirmed twilio installed, resend/expo-server-sdk NOT installed

### Secondary (MEDIUM confidence)
- [docs.360dialog.com messaging API](https://docs.360dialog.com/docs/waba-basics/waba-integration) — confirmed waba-v2.360dialog.io endpoint, D360-API-KEY header, template message format, no official Node.js SDK
- [expo.dev push notifications docs](https://docs.expo.dev/push-notifications/sending-notifications/) — sendPushNotificationsAsync, chunkPushNotifications, isExpoPushToken patterns
- [resend.com Node.js docs](https://resend.com/nodejs) — emails.send() with react prop, React Email templates
- [Stripe API Refunds](https://docs.stripe.com/api/refunds/create) — partial refund with `amount` parameter, `reverse_transfer` behavior
- [Twilio SMS Node.js quickstart](https://www.twilio.com/docs/messaging/quickstart) — client.messages.create() pattern
- [shadcn/ui sidebar component](https://www.shadcn.io/template/salimi-my-shadcn-ui-sidebar) — available via `npx shadcn add sidebar`

### Tertiary (LOW confidence)
- npm registry version check — resend@3.5.0, expo-server-sdk@6.1.0, @react-email/components@1.0.11 (verified via `npm view` at research time)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed package.json and npm registry
- Architecture: HIGH — derived from existing code patterns in the codebase
- Notification channels: MEDIUM — API patterns verified against official docs; 360dialog template approval status unknown
- Pitfalls: HIGH — derived from existing codebase decisions (STATE.md) and confirmed missing schema fields

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days — stable library ecosystem)
