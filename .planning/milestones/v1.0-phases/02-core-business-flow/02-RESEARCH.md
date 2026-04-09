# Phase 2: Core Business Flow - Research

**Researched:** 2026-04-02
**Domain:** Marketplace booking flow — discovery, booking, payments (Stripe Connect), order lifecycle, company dashboard, BullMQ async jobs, Socket.io real-time, React/Next.js/Vite UI
**Confidence:** HIGH (Phase 1 research verified the stack; this research focuses on Phase 2 integration patterns for the specific libraries needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Service category selection uses 3 big visual cards with icons/illustrations on the home screen (car wash, carpet, sofa). Clean, obvious, tappable. Careem/Talabat-style service selection.
- **D-02:** Company listing cards are rich — logo, company name, star rating, review count, starting price, response time badge. One card per row in a scrollable list.
- **D-03:** GPS city detection fallback is a city picker dropdown modal/sheet with available cities. Customer taps their city, then sees filtered companies.
- **D-04:** Company profile page is a single scrollable page (no tabs) — header → packages → add-ons → reviews (show 3-5, "see all" link). Natural scroll flow.
- **D-05:** Booking is a single scrollable page — package → add-ons → location/time → summary → pay. Sticky bottom bar shows running total. No multi-step wizard.
- **D-06:** On-site location selection uses a draggable map pin (full-screen map, centered pin, reverse geocoding for address). Plus a text field for parking/access notes. Standard ride-hailing pattern.
- **D-07:** Carpet pickup time selection uses a date picker + 2-hour time slot grid (e.g., 9-11, 11-1, 1-3, 3-5). Company defines available slots. Estimated return date shown below.
- **D-08:** Add-ons presented as toggleable chips/cards — name, price, toggle to add. Running total updates instantly in the sticky bottom bar.
- **D-09:** Payment uses Stripe Payment Element (pre-built component handling card, Apple Pay, Google Pay). Minimal PCI scope. Stripe handles method adaptation automatically.
- **D-10:** Platform fee visible to customer as "service fee" line item — transparent breakdown: subtotal + service fee + total. Standard marketplace pattern.
- **D-11:** Payment failure shows inline error on the same screen ("Card declined — try another card"). Customer retries without losing booking details. Order stays pending until timeout.
- **D-12:** Wallet top-up (PAY-02) deferred to a future phase. Phase 2 is direct Stripe payments only.
- **D-13:** Order feed is a data table with columns (order #, customer, service, status, time, amount) and status filter tabs across top (All / Pending / Active / Completed). Real-time row updates via Socket.io.
- **D-14:** Washer assignment via dropdown on order row — click "Assign", dropdown shows available washers (name + current status), select and confirm. Washer receives push notification.
- **D-15:** Full company onboarding in Phase 2 — bilingual profile setup, city coverage, package/add-on creation, and Stripe Connect onboarding. Companies fully self-serve.
- **D-16:** company-web i18n wired in Phase 2 — i18next set up from day 1, all new pages use translation keys. No English-only retrofit later.
- **D-17:** On-site order follows 7-state lifecycle: pending → accepted → washer_assigned → washer_en_route → in_progress → completed (+ cancelled). State transitions enforced by `isValidTransition()` from `@cleanly/types`.
- **D-18:** Carpet order follows 10-state lifecycle: pending → accepted → pickup_scheduled → picked_up → in_cleaning → ready_for_return → return_scheduled → out_for_return → returned → completed. Extension table `carpet_order_details` tracks carpet-specific data.
- **D-19:** Order state transitions use database-level locking (Prisma `$transaction` with row-level lock) to prevent race conditions on concurrent status updates.
- **D-20:** BullMQ `order-lifecycle` queue (already scaffolded) handles async side effects on state transitions — notifications, payout triggers, etc.

### Claude's Discretion

- TanStack Query setup pattern (QueryClient config, wrapper placement, hook conventions)
- API route organization (per-domain files vs single router)
- Stripe webhook verification implementation details
- Map library choice for location pin (Google Maps, Mapbox, or Leaflet)
- Company-web routing structure (react-router vs TanStack Router)
- Real-time update mechanism for company dashboard (Socket.io room design)
- Order timeout/cancellation policy implementation details
- Stripe Connect onboarding flow type (Standard vs Express vs Custom)

### Deferred Ideas (OUT OF SCOPE)

- **Wallet top-up (PAY-02)**: Deferred from Phase 2. Direct Stripe payments only for now. Wallet adds complexity (top-up flow, balance checks, partial wallet+card combos) — ship core payment first.
- **Loyalty points and promo codes**: Already in v2 requirements (RET-01 through RET-06). Not Phase 2 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | Customer can browse three service categories (car wash, carpet, sofa) | Category card components + city detection API endpoint |
| DISC-02 | Customer's city is auto-detected via GPS with manual fallback | Browser Geolocation API + city lookup endpoint + city picker UI |
| DISC-03 | Customer can view company listings filtered by city and category | GET /companies?city_id=&category= API with Prisma city/category filter |
| DISC-04 | Company listings show name, rating, price range, review count, and logo | Prisma aggregate query (avg rating, review count, min package price) |
| DISC-05 | Customer can view a company profile with packages, add-ons, and reviews | GET /companies/:id with Prisma include (packages → addons, reviews with pagination) |
| BOOK-01 | Customer can select a package with quantity (per vehicle / per seat) | Client state: selected package + quantity; price computed client-side from fils values |
| BOOK-02 | Customer can add optional add-ons to their booking | Client state: selected add-ons array; running total computed from base_price + add-on prices |
| BOOK-03 | Customer can pin their service location on a map with a parking/address note | react-leaflet draggable pin + Nominatim reverse geocode + location_note text input |
| BOOK-04 | Customer sees order summary with subtotal, add-ons, platform fee, and total before payment | Platform fee computed server-side at PaymentIntent creation from commission_rate on Company |
| CARP-01 | Customer can select carpet cleaning package with quantity (number of carpets/rooms) | Same package/quantity pattern as BOOK-01; carpet-specific quantity label |
| CARP-02 | Customer can select a pickup time slot for carpet collection | Date picker + time-slot grid UI component; pickup_time stored in CarpetOrderDetails |
| CARP-03 | Customer can see and agree to an estimated return date at booking time | return_date computed from pickup_time + company-configured lead_time_days |
| CARP-04 | Customer can reschedule the return date before carpet is out for delivery | PATCH /orders/:id/carpet-return-date endpoint guarded by state check |
| CARP-05 | Carpet order follows 10-state lifecycle | VALID_TRANSITIONS map in @cleanly/types + isValidTransition() enforced in transition endpoint |
| PAY-01 | Customer can pay via Stripe (card, Apple Pay, Google Pay) | Stripe Payment Element via @stripe/react-stripe-js; PaymentIntent created server-side |
| PAY-02 | DEFERRED — wallet balance payment | OUT OF SCOPE for Phase 2 |
| PAY-03 | Platform commission (15-20%) is auto-deducted before company payout | application_fee_amount on PaymentIntent = subtotal × company.commission_rate / 100 |
| PAY-04 | Company receives payout via Stripe Connect with 7-14 day delay after completion | BullMQ payout job triggered at order completion; transfer created after delay via transfer_data.destination |
| PAY-05 | Stripe webhook handles payment capture, refunds, and disputes | @fastify/rawbody for webhook signature verification; handlers for payment_intent.succeeded, charge.dispute.created |
| PAY-06 | Refund flow reverses transfer before issuing customer refund | stripe.refunds.create with reverse_transfer: true, refund_application_fee: true |
| ORD-01 | On-site order follows 7-state lifecycle | VALID_TRANSITIONS + isValidTransition() in transition endpoint |
| ORD-02 | Company receives real-time notification when new order is placed | Socket.io emit to company room `company:{companyId}` on order creation |
| ORD-03 | Company can assign a washer to an accepted order | PATCH /orders/:id/assign-washer — validates washer belongs to company; transitions to washer_assigned |
| ORD-04 | Washer can accept or decline job assignment (30s timer) | POST /orders/:id/washer-response; server-side timer via BullMQ delayed job for auto-decline after 30s |
| ORD-05 | Order state transitions use database-level locking | Prisma $transaction with $executeRaw SELECT FOR UPDATE; or optimistic version check pattern |
| ORD-06 | Customer can cancel order with policy enforcement | DELETE /orders/:id — free if status is pending/accepted; fee computed if washer_assigned or later |
| COMP-01 | Company can set up profile with bilingual fields | Company onboarding PUT /company/profile; name_en/name_ar/description_en/description_ar validated |
| COMP-02 | Company can manage city coverage and service categories | PUT /company/services — updates CompanyService records for city_id and category |
| COMP-03 | Company can create/edit/delete packages and add-ons with bilingual names | CRUD /company/packages, /company/packages/:id/add-ons |
| COMP-04 | Company can manage washer staff accounts | CRUD /company/washers — create User(role: washer, company_id) + WasherProfile |
| COMP-05 | Company sees live order feed with real-time updates | Socket.io room company:{companyId}; client reconnects and re-joins on reconnect |
| COMP-06 | Company can assign washers to incoming orders | PATCH /orders/:id/assign-washer endpoint |
| COMP-07 | Company can complete Stripe Connect onboarding for payouts | AccountLink for UAE Express onboarding (requires prior Stripe contact); account.updated webhook |
</phase_requirements>

---

## Summary

Phase 2 builds the complete marketplace business loop on top of Phase 1's authentication and infrastructure foundation. The phase spans three surfaces simultaneously: `apps/customer-web` (Next.js, booking flow), `apps/company-web` (Vite SPA, dashboard + onboarding), and `apps/api` (Fastify, 25+ new endpoints). All three surfaces are needed to validate the end-to-end loop — a customer books, a company accepts and assigns, a washer gets the job, Stripe pays out.

The key technical challenges are (1) the Stripe Connect UAE constraint — Express onboarding is not self-serve and requires prior Stripe contact before any payout code is written; (2) row-level locking for order state transitions — Prisma does not natively support FOR UPDATE, requiring raw SQL via `$executeRaw` inside `$transaction`; (3) the real-time company dashboard — Socket.io rooms keyed by `company:{companyId}` with the client library added to `company-web` for the first time; (4) the map location pin — use react-leaflet + OpenStreetMap tiles (free, no API key) with Nominatim reverse geocoding (1 req/s limit acceptable for drag-end events); and (5) i18next setup on `company-web` from day one per D-16.

**Primary recommendation:** Build in wave order: API routes first (foundation for all UI work), then customer-web booking flow, then company-web dashboard. All three surfaces share the same `@cleanly/types` and `@cleanly/i18n` packages already scaffolded in Phase 1.

---

## Standard Stack

### Core (Phase 2 additions — all already in CLAUDE.md stack)

| Library | Version (npm verified) | Purpose | Why Standard |
|---------|----------------------|---------|--------------|
| `@stripe/stripe-js` | 9.0.1 | Stripe client-side (Publishable key, loadStripe) | Official Stripe browser SDK |
| `@stripe/react-stripe-js` | 6.1.0 | React wrapper: `<Elements>`, `<PaymentElement>` | Official React Stripe components |
| `stripe` (Node) | 21.0.1 | Stripe server SDK: PaymentIntent, Connect, webhooks | Required server-side |
| `react-leaflet` | 5.0.0 | React wrapper for Leaflet map | Open-source, zero tile cost, SSR-compatible with dynamic import |
| `leaflet` | 1.9.4 | Core map library (peer dep of react-leaflet) | Required peer dependency |
| `socket.io-client` | 4.8.3 | WebSocket client for customer-web and company-web | Must match server version (4.8.3) |
| `@tanstack/react-query` | 5.96.1 | Server state management for all API calls | Already in CLAUDE.md recommended stack |
| `i18next` | 26.0.3 | i18n core for company-web (customer-web uses next-intl) | Standard React i18n |
| `react-i18next` | 17.0.2 | React hooks/components for i18next in company-web | Hooks: `useTranslation`, `Trans` |
| `react-router` | 7.13.2 | SPA routing for company-web | See routing decision below |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `i18next-browser-languagedetector` | latest | Auto-detect language from localStorage/browser | company-web language detection |
| `@fastify/rawbody` | latest | Preserve raw request body for Stripe webhook verification | Required — `stripe.webhooks.constructEvent` needs raw bytes |
| `date-fns` | 3.x | Date arithmetic for estimated return date calculation | Already in CLAUDE.md stack |
| `react-hook-form` | latest | Form state for company onboarding (bilingual fields) | Already in CLAUDE.md stack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-leaflet + OpenStreetMap | Google Maps JS API | Google Maps requires paid API key after free tier ($200/mo credit). Leaflet + OSM is zero cost with Stadia Maps tiles (2,000 daily views free). For a startup, Leaflet wins. |
| react-leaflet + OpenStreetMap | Mapbox GL JS / react-map-gl | Mapbox has a generous free tier but requires API key registration. Adds vendor dependency. Leaflet is simpler and sufficient for a single draggable pin. |
| react-router v7 (for company-web) | TanStack Router | TanStack Router is excellent for type-safety at scale. However, it's at `0.0.1-beta.53` on npm (not stable 1.x). React Router v7 is stable, has SPA mode, smaller bundle (20KB vs 45KB), and is already familiar from the ecosystem. Recommendation: react-router v7. |
| Nominatim (for reverse geocoding) | Google Maps Geocoding API | Nominatim public API is free but limited to 1 req/s. On drag-end events (not drag), 1 req/s is sufficient — users drag to a position and release. Acceptable for launch. |
| next-intl (customer-web) | i18next | customer-web already uses next-intl (established in Phase 1). company-web is Vite SPA — next-intl is Next.js-specific. Use i18next for company-web. |

### Installation

```bash
# customer-web additions
cd apps/customer-web
pnpm add @stripe/react-stripe-js @stripe/stripe-js react-leaflet leaflet socket.io-client @tanstack/react-query

# company-web additions
cd apps/company-web
pnpm add react-router @tanstack/react-query socket.io-client i18next react-i18next i18next-browser-languagedetector react-hook-form

# API additions
cd apps/api
pnpm add @fastify/rawbody
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
apps/api/src/
├── routes/
│   ├── discovery/
│   │   └── companies.ts        # GET /companies, GET /companies/:id
│   ├── booking/
│   │   └── orders.ts           # POST /orders (create booking + PaymentIntent)
│   ├── payments/
│   │   └── webhook.ts          # POST /webhooks/stripe (raw body required)
│   │   └── stripe.ts           # POST /payments/intent (create PaymentIntent)
│   ├── orders/
│   │   └── lifecycle.ts        # PATCH /orders/:id/status, /assign-washer, /cancel
│   └── company/
│       ├── profile.ts           # PUT /company/profile
│       ├── packages.ts          # CRUD /company/packages
│       └── washers.ts           # CRUD /company/washers
├── services/
│   ├── order.service.ts         # isValidTransition wrapper + locking logic
│   ├── stripe.service.ts        # PaymentIntent creation, payout transfer
│   └── socket.service.ts        # Room join/emit helpers
└── workers/
    └── order.worker.ts          # BullMQ consumer for order-lifecycle queue

apps/customer-web/app/[locale]/
├── page.tsx                     # Home — service category selection
├── companies/
│   └── page.tsx                 # Company listing (DISC-03)
├── companies/[slug]/
│   └── page.tsx                 # Company profile (DISC-05)
├── booking/
│   ├── on-site/page.tsx         # On-site booking (BOOK-01–04)
│   └── carpet/page.tsx          # Carpet booking (CARP-01–04)
├── payment/page.tsx             # Stripe Payment Element (PAY-01)
├── booking-confirmed/page.tsx   # Confirmation screen (ORD-01)
└── orders/[id]/page.tsx         # Order status (ORD-01–06)

apps/company-web/src/
├── main.tsx                     # i18next init + React root
├── router.tsx                   # react-router v7 route definitions
├── pages/
│   ├── dashboard/
│   │   └── orders.tsx           # Order feed (COMP-05, COMP-06)
│   └── onboarding/
│       ├── profile.tsx          # COMP-01
│       ├── services.tsx         # COMP-02
│       ├── packages.tsx         # COMP-03
│       ├── washers.tsx          # COMP-04
│       └── stripe-connect.tsx   # COMP-07
└── lib/
    ├── i18n.ts                  # i18next configuration
    ├── socket.ts                # Socket.io client singleton
    └── query-client.ts          # TanStack Query QueryClient
```

### Pattern 1: Stripe PaymentIntent with Destination Charge (server-side)

**What:** Creates PaymentIntent with platform fee extracted before company transfer. All amounts in fils (AED × 100).
**When to use:** Every new order creation — compute total server-side from package IDs, never trust client amounts.

```typescript
// Source: .planning/research/CONTEXT7_VERIFIED.md (Stripe Connect section)
// apps/api/src/services/stripe.service.ts

const paymentIntent = await stripe.paymentIntents.create({
  amount: order.amount_total,            // in fils, computed server-side
  currency: 'aed',
  automatic_payment_methods: { enabled: true },
  application_fee_amount: order.platform_fee,  // 15% of subtotal
  transfer_data: {
    destination: company.stripe_account_id,    // Company's Connect account
  },
  metadata: {
    order_id: order.id,
    company_id: order.company_id,
  },
});
```

**Security invariant:** Prices always computed from database package/add-on IDs. Client sends only `package_id`, `quantity`, `add_on_ids[]` — never amounts. Server recomputes `amount_subtotal`, `platform_fee`, `amount_total` from the Company's `commission_rate`.

### Pattern 2: Order State Transition with Row-Level Locking

**What:** Prisma does not expose `FOR UPDATE` natively (open GitHub issues #5983, #17136). Use `$executeRaw` inside `$transaction` to acquire row lock before transition.
**When to use:** Every `PATCH /orders/:id/status` endpoint and any other state-changing operation.

```typescript
// Source: Prisma docs (transactions), WebSearch verification (Prisma GitHub issues)
// apps/api/src/services/order.service.ts

async function transitionOrderStatus(
  orderId: string,
  targetStatus: OrderStatus,
  actorId: string,
): Promise<Order> {
  return await prisma.$transaction(async (tx) => {
    // Acquire row-level lock — prevents concurrent transitions on same order
    await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

    if (!isValidTransition(order.status, targetStatus)) {
      throw new Error(`Invalid transition: ${order.status} → ${targetStatus}`);
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        completed_at: targetStatus === 'completed' ? new Date() : undefined,
      },
    });
  });
}
```

**Note:** `isValidTransition` is already implemented in `packages/types/src/order.ts` and exported from `@cleanly/types`. The state machines (7-state on-site, 10-state carpet) are already encoded as `VALID_TRANSITIONS` there.

### Pattern 3: Stripe Webhook with Raw Body Verification

**What:** Stripe requires the raw (unparsed) request body to verify webhook signatures. Fastify parses JSON by default — must register `@fastify/rawbody` and use it on the webhook route.
**When to use:** The `/webhooks/stripe` endpoint only.

```typescript
// Source: Stripe Node SDK docs, @fastify/rawbody README
// apps/api/src/routes/payments/webhook.ts

// Register rawbody plugin in server.ts before route registration
await server.register(require('@fastify/rawbody'), {
  field: 'rawBody',
  global: false,        // Only on routes that opt in
  runFirst: true,
});

// Webhook route with rawBody option enabled
fastify.post('/webhooks/stripe', {
  config: { rawBody: true }
}, async (request, reply) => {
  const sig = request.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      request.rawBody!,          // Raw bytes — NOT request.body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return reply.status(400).send({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Update order.payment_status to 'paid'
      break;
    case 'charge.dispute.created':
      // Flag order, pause payout job
      break;
    case 'account.updated':
      // Update company.stripe_account_id status
      break;
    case 'payout.failed':
      // Alert, manual intervention
      break;
  }

  return reply.status(200).send({ received: true });
});
```

### Pattern 4: Socket.io Room Design for Company Dashboard

**What:** Two room types needed in Phase 2 — company rooms (for order feed updates) and order rooms (for order status updates to customers). Phase 3 adds GPS tracking rooms.
**When to use:** All real-time events.

```typescript
// Source: .planning/research/CONTEXT7_VERIFIED.md (Socket.io section) + Phase 2 decision D-13

// Room naming conventions:
// company:{companyId}     — new orders, order status changes visible to company dashboard
// order:{orderId}         — order status changes visible to customer tracking page
// (Phase 3 only) washer:{washerId} — GPS location broadcasts

// Server: emit to company room on order creation
io.to(`company:${order.company_id}`).emit('order:new', {
  orderId: order.id,
  status: order.status,
  customerName: order.customer.name,
  service: order.type,
  amount: order.amount_total,
});

// Server: emit to both rooms on status transition
io.to(`company:${order.company_id}`).emit('order:status-changed', { orderId, status });
io.to(`order:${order.id}`).emit('order:status-changed', { orderId, status });

// Client (company-web): join company room after auth
socket.emit('join:company', { companyId, token });
// Server validates JWT before allowing join
socket.on('join:company', ({ companyId, token }) => {
  const payload = fastify.jwt.verify(token);
  if (payload.companyId !== companyId) return;
  socket.join(`company:${companyId}`);
});
```

### Pattern 5: react-leaflet Map Pin (customer-web booking)

**What:** react-leaflet with OpenStreetMap tiles. Map renders at fixed height; user drags the map, not the pin. On `moveend`, fire reverse geocode to Nominatim.
**When to use:** On-site booking location selection (BOOK-03).

```typescript
// Source: react-leaflet v5 docs + Nominatim API docs
// apps/customer-web/app/[locale]/booking/on-site/page.tsx
// NOTE: Must use dynamic import — react-leaflet is client-only
// import('react-leaflet') in a 'use client' component, or next/dynamic with ssr: false

import dynamic from 'next/dynamic'

const LocationPicker = dynamic(
  () => import('@/src/components/LocationPicker'),
  { ssr: false }  // Leaflet requires window — not SSR-compatible
)

// Inside LocationPicker (client component):
// MapContainer with useMapEvents hook listening to 'moveend'
// On moveend: capture center coords, call Nominatim:
// GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json
// Rate limit: 1 request per second — debounce with 800ms delay on drag end
```

**Critical:** react-leaflet requires `window` and cannot be server-rendered. Always use `next/dynamic` with `ssr: false` for the map component. Also requires leaflet CSS to be imported: `import 'leaflet/dist/leaflet.css'` inside the client component (not in globals.css for SSR safety).

### Pattern 6: TanStack Query Setup in Next.js App Router

**What:** QueryClient in a client component provider; Server Components can prefetch and dehydrate for initial data.
**When to use:** All API calls on customer-web pages.

```typescript
// Source: TanStack Query v5 docs (Advanced Server Rendering guide)
// apps/customer-web/src/providers/query-provider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,   // 1 minute — company listings don't change rapidly
        retry: 1,
      },
    },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// Wrap in app/[locale]/layout.tsx inside NextIntlClientProvider
```

### Pattern 7: i18next Setup in company-web (Vite SPA)

**What:** i18next + react-i18next with browser language detector. Initialize before rendering. Share translation JSON from `packages/i18n/locales/`.
**When to use:** All company-web pages per D-16.

```typescript
// Source: react-i18next docs + WebSearch verification
// apps/company-web/src/lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
// Import from shared package — same JSON as customer-web
import enTranslations from '@cleanly/i18n/locales/en.json'
import arTranslations from '@cleanly/i18n/locales/ar.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

// In main.tsx: import './lib/i18n' before ReactDOM.createRoot
// RTL: add useEffect in App.tsx that sets document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
```

### Pattern 8: react-router v7 in company-web (SPA mode)

**What:** react-router v7 in SPA (non-framework) mode — no SSR, no Vite plugin. Standard client-side routing.
**When to use:** All company-web navigation.

```typescript
// Source: React Router v7 docs (SPA / component mode)
// apps/company-web/src/main.tsx
import { BrowserRouter } from 'react-router'

// apps/company-web/src/router.tsx
import { Routes, Route } from 'react-router'
// Note: In SPA mode (no Vite plugin), use the component API — not the file-based API
// Component API: <BrowserRouter><Routes><Route path="/" element={<App />} /></Routes></BrowserRouter>
```

**Rationale:** react-router v7 in component mode (no Vite plugin) is the correct choice for company-web because: (a) the Vite plugin moves entrypoint to root.tsx which disrupts our existing Vite config; (b) SPA mode = simple, no SSR complexity; (c) stable v7.13.2 vs TanStack Router's `0.0.1-beta.53` pre-release.

### Anti-Patterns to Avoid

- **Computing prices client-side from UI state:** Always recompute `amount_total` server-side from database package IDs. Never accept amount from the client body.
- **Importing leaflet/react-leaflet at module level in Next.js:** Will cause SSR failure with "window is not defined". Always use `next/dynamic` with `ssr: false`.
- **Using Stripe `on_behalf_of` for UAE:** Not supported for UAE platforms. Use `transfer_data.destination` (destination charges) only.
- **Creating PaymentIntent before order is persisted:** Order must exist in DB before PaymentIntent is created — use the order ID as PaymentIntent metadata for webhook reconciliation.
- **Passing raw Stripe webhook body through JSON parsing:** Fastify parses JSON by default. Register `@fastify/rawbody` with `global: false` to avoid impacting other routes.
- **Joining Socket.io rooms without JWT validation:** Company room join must validate the JWT token and verify `payload.companyId === requestedCompanyId` before calling `socket.join()`.
- **Using `marginLeft`/`marginRight` in company-web components:** D-16 requires RTL-ready CSS from day one. Use `ms-`, `me-`, `ps-`, `pe-` Tailwind logical properties throughout.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map display + draggable pin | Custom canvas map, custom GPS marker | react-leaflet v5 + OpenStreetMap tiles | Leaflet handles touch events, zoom, tile loading, pin positioning, viewport math. Thousands of edge cases in map rendering. |
| Reverse geocoding (address from lat/lng) | Custom geocoding service | Nominatim public API (free, 1 req/s) | OpenStreetMap's geocoder covers UAE addresses adequately. Rate limit acceptable for user drag-end events. |
| Payment form (card input, Apple Pay, Google Pay) | Custom card input with PAN handling | Stripe Payment Element | PCI DSS compliance alone makes custom card input a non-starter. Payment Element handles SCA, 3DS, Apple/Google Pay, all in one component. |
| Stripe webhook signature verification | Custom HMAC comparison | `stripe.webhooks.constructEvent()` | Stripe's library handles timing-safe comparison, event type casting, and key rotation. |
| Order state validation logic | Custom if/else transition checks | `isValidTransition()` from `@cleanly/types` | Already implemented in Phase 1 with the full VALID_TRANSITIONS map for both lifecycles. |
| Bilingual field validation (both EN + AR required) | Custom form validation | react-hook-form with Zod schema requiring both `_en` and `_ar` fields non-empty | Zod `.min(1)` on both bilingual columns enforced at API level; react-hook-form handles field-level errors. |
| Company dashboard real-time | Polling every 5 seconds | Socket.io room `company:{companyId}` | Polling has latency and server cost. Socket.io push is instant and already wired in the API server. |

**Key insight:** Every item in this list has already caused teams to lose weeks. The map alone (proper touch drag, RTL marker positioning, address parsing for Arabic/English place names) would take 2-3 weeks to build reliably. react-leaflet + OpenStreetMap + Nominatim delivers this in 1-2 days.

---

## Common Pitfalls

### Pitfall 1: Stripe Connect UAE — Express Onboarding is NOT Self-Serve

**What goes wrong:** The standard `stripe.accountLinks.create()` hosted onboarding flow does not work for UAE Express accounts. The company completes the link but the account never activates. Payouts fail with "account not enabled" errors.

**Why it happens:** UAE is classified as a "limited availability" country for Stripe Connect. Self-serve Express onboarding requires prior Stripe approval. Most tutorials assume US/EU markets.

**How to avoid:**
- Contact Stripe support BEFORE writing any Connect onboarding code to confirm the current state of UAE Express onboarding. This is a known blocker documented in PITFALLS.md.
- Design the onboarding UI to show a "pending Stripe activation" state after the AccountLink is submitted. Companies should be able to use the dashboard (manage packages, accept orders) while Stripe activation is pending.
- Only block payout-related functionality on Stripe Connect status — not all company features.
- Use `transfer_data.destination` (destination charges) — NOT `on_behalf_of`.

**Warning signs:** `account.updated` webhooks with `requirements.currently_due` fields that never clear. `stripe.transfers.create()` returning 400 errors.

### Pitfall 2: React-Leaflet SSR Crash in Next.js

**What goes wrong:** `import { MapContainer } from 'react-leaflet'` at the top of a page component causes a build-time or runtime error: "ReferenceError: window is not defined". This happens because Leaflet directly accesses `window` and `document` at import time.

**Why it happens:** Next.js App Router renders page components on the server. react-leaflet is a client-only library. Even `'use client'` components are rendered on the server during initial hydration.

**How to avoid:**
- Always wrap the map component with `next/dynamic` with `ssr: false`:
  ```typescript
  const LocationPicker = dynamic(() => import('@/src/components/LocationPicker'), { ssr: false })
  ```
- Import `leaflet/dist/leaflet.css` inside the dynamically imported client component, not in `globals.css` or layout files.
- The `LocationPicker` component file should NOT be a page — it should be a separate component file that gets dynamically imported.

**Warning signs:** Build-time TypeScript error referencing `window`, or runtime hydration mismatch on the booking page.

### Pitfall 3: Order Amount Manipulation via Client Request

**What goes wrong:** Client sends `{ package_id: "pkg_123", amount: 1 }` and the API creates a PaymentIntent for AED 0.01 instead of the real price.

**Why it happens:** Developer builds the payment flow quickly and accepts the amount from the client body to save the server lookup round-trip.

**How to avoid:**
- API route for order creation accepts only: `package_id`, `quantity`, `add_on_ids[]`, `service_location`, `location_note` (on-site) or `pickup_time`, `carpet_count` (carpet).
- Server fetches Package and AddOn prices from the database and computes the total:
  ```
  amount_subtotal = package.base_price * quantity + sum(addon.price for selected addons)
  platform_fee = Math.round(amount_subtotal * company.commission_rate / 100)
  amount_total = amount_subtotal + platform_fee
  ```
- `application_fee_amount` on PaymentIntent comes from `platform_fee` — never from the client.

**Warning signs:** Any route handler that reads an `amount` field from `request.body` for payment creation.

### Pitfall 4: Missing `@fastify/rawbody` on Stripe Webhook Route

**What goes wrong:** Stripe webhook signature verification fails with "No signatures found matching the expected signature for payload". Every webhook returns 400. Payment confirmations never process. Order statuses never advance.

**Why it happens:** Fastify parses `application/json` request bodies into JavaScript objects before route handlers run. `stripe.webhooks.constructEvent()` requires the original raw bytes. The parsed JS object is not the same as the original bytes.

**How to avoid:**
- Register `@fastify/rawbody` plugin with `global: false` so it only activates on the webhook route.
- Set `config: { rawBody: true }` on the webhook route.
- Pass `request.rawBody` (not `request.body`) to `stripe.webhooks.constructEvent()`.

**Warning signs:** Stripe webhook delivery logs showing 400 responses. "Webhook signature verification failed" in API logs.

### Pitfall 5: Socket.io Client Not Reconnecting to Company Room After Disconnect

**What goes wrong:** Company dashboard shows stale order data after a network interruption. New orders created during the disconnect are never shown. The dashboard appears live but is actually frozen.

**Why it happens:** The Socket.io client reconnects automatically but does not automatically re-join rooms after reconnect. Room membership is transient server state, lost on disconnect.

**How to avoid:**
- Listen for the `connect` event (fires on initial connect AND on reconnect) to join the company room:
  ```typescript
  socket.on('connect', () => {
    socket.emit('join:company', { companyId, token })
  })
  ```
- After re-join, fetch latest orders from the REST API to fill any gap during the disconnect window.

**Warning signs:** Company dashboard "goes dark" for 30+ seconds and doesn't recover after a WiFi switch.

### Pitfall 6: Prisma Transaction Without FOR UPDATE Does Not Prevent Race Conditions

**What goes wrong:** Two concurrent requests both read `order.status === 'pending'`, both pass the `isValidTransition()` check, and both update to `'accepted'`. The washer assignment race (Pitfall 5 in PITFALLS.md) materializes as corrupt order state.

**Why it happens:** Standard Prisma `$transaction` wraps multiple operations in a transaction but does NOT acquire row-level locks unless explicitly requested via raw SQL. Developers assume transaction = serialized = safe. It is NOT. Two transactions at READ COMMITTED can both read the same row before either writes.

**How to avoid:**
- Use `SELECT ... FOR UPDATE` raw SQL as the FIRST statement inside every order state transition transaction:
  ```typescript
  await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  ```
  This blocks any other transaction that tries to lock the same order until the first transaction commits.
- Keep the transaction body small — only the lock + read + validate + update. Move all other logic outside.

**Warning signs:** Tests pass in serial but fail under concurrent load. Orders stuck in intermediate states.

---

## Code Examples

Verified patterns from official sources and Phase 1 research:

### Company Discovery Endpoint (GET /companies)

```typescript
// Source: Prisma docs (aggregation, include), CLAUDE.md data conventions
// apps/api/src/routes/discovery/companies.ts

fastify.get('/companies', {
  schema: {
    querystring: z.object({
      city_id: z.string(),
      category: z.enum(['car_wash', 'carpet', 'sofa']),
      page: z.coerce.number().default(1),
    }),
  },
}, async (request) => {
  const { city_id, category, page } = request.query

  const companies = await prisma.company.findMany({
    where: {
      city_id,
      is_verified: true,
      services: { some: { category } },
    },
    include: {
      services: { where: { category } },
      packages: {
        where: { category, is_active: true },
        orderBy: { base_price: 'asc' },
        take: 1,   // min price for display
      },
      _count: { select: { orders: true } },
    },
    skip: (page - 1) * 20,
    take: 20,
  })

  // Compute average rating via raw query (Prisma doesn't aggregate across relations)
  // Or add avg_rating as a computed column to the Company model in a future migration
  return { companies, page }
})
```

### Order Creation (POST /orders)

```typescript
// Source: CONTEXT7_VERIFIED.md Stripe pattern + Prisma $transaction
// apps/api/src/routes/booking/orders.ts

fastify.post('/orders', {
  preHandler: [fastify.authenticate],
  schema: { body: createOrderSchema },
}, async (request, reply) => {
  const { package_id, quantity, add_on_ids, service_location, location_note, order_type } = request.body
  const customer_id = request.user.sub

  // 1. Fetch and lock company commission rate server-side
  const pkg = await prisma.package.findUniqueOrThrow({
    where: { id: package_id },
    include: { company: true, add_ons: { where: { id: { in: add_on_ids } } } },
  })

  // 2. Compute all amounts in fils — NEVER accept from client
  const add_ons_total = pkg.add_ons.reduce((s, a) => s + a.price, 0)
  const amount_subtotal = pkg.base_price * quantity + add_ons_total
  const platform_fee = Math.round(amount_subtotal * pkg.company.commission_rate / 100)
  const amount_total = amount_subtotal + platform_fee

  // 3. Create order and PaymentIntent atomically
  const order = await prisma.order.create({
    data: {
      type: order_type,
      customer_id,
      company_id: pkg.company_id,
      amount_subtotal,
      platform_fee,
      amount_total,
      service_location: order_type === 'on_site' ? service_location : undefined,
      location_note,
      items: { create: [{ package_id, quantity, unit_price: pkg.base_price }] },
    },
  })

  // 4. Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount_total,
    currency: 'aed',
    automatic_payment_methods: { enabled: true },
    application_fee_amount: platform_fee,
    transfer_data: { destination: pkg.company.stripe_account_id! },
    metadata: { order_id: order.id },
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { payment_intent_id: paymentIntent.id },
  })

  return { order_id: order.id, client_secret: paymentIntent.client_secret }
})
```

### Stripe Payment Element (customer-web)

```typescript
// Source: @stripe/react-stripe-js docs, CONTEXT7_VERIFIED.md
// apps/customer-web/app/[locale]/payment/page.tsx  ('use client')

import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Wrap in Elements with locale:
<Elements stripe={stripePromise} options={{
  clientSecret,
  locale: locale === 'ar' ? 'ar' : 'en',  // Payment Element renders in Arabic
  appearance: {
    theme: 'flat',
    variables: { colorPrimary: '#C9A84C' },  // brand-gold
  },
}}>
  <PaymentForm />
</Elements>

// Inside PaymentForm:
const stripe = useStripe()
const elements = useElements()
const { error } = await stripe.confirmPayment({
  elements,
  redirect: 'if_required',
  confirmParams: { return_url: `${origin}/booking-confirmed?order=${orderId}` },
})
// On error: display error.message inline below the PaymentElement (D-11)
```

### BullMQ Payout Job (order completion trigger)

```typescript
// Source: .planning/research/CONTEXT7_VERIFIED.md + PITFALLS.md (BullMQ idempotency)
// apps/api/src/workers/order.worker.ts

import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'

const worker = new Worker('order-lifecycle', async (job) => {
  if (job.name === 'schedule-payout') {
    const { order_id, transfer_amount, destination } = job.data

    // Idempotency: skip if transfer already created
    const order = await prisma.order.findUniqueOrThrow({ where: { id: order_id } })
    if (order.payment_status !== 'paid') return

    // 7-day payout delay
    const delay = 7 * 24 * 60 * 60 * 1000

    // Use Stripe idempotency key to prevent double transfer
    await stripe.transfers.create({
      amount: transfer_amount,
      currency: 'aed',
      destination,
      transfer_group: order_id,
    }, {
      idempotencyKey: `transfer-${order_id}`,
    })
  }
}, { connection: redis })

// Graceful shutdown (PITFALLS.md: prevents stalled jobs)
process.on('SIGTERM', async () => {
  await worker.close()
  process.exit(0)
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Checkout (redirect) | Stripe Payment Element (embedded) | 2023–2024 | No redirect = less drop-off; Apple/Google Pay in-page; locale support |
| Manual JWT session management in Socket.io | JWT validation in `join:room` event handler | Always | Prevents room spoofing — validate identity before any room join |
| Polling for order updates | Socket.io rooms (push) | Always | Zero latency, no unnecessary API calls |
| `react-router` v5/v6 component API | `react-router` v7 (stable Dec 2024) | Dec 2024 | Simpler data loading, type-safe params, SPA mode built in |
| `moment.js` date handling | `date-fns` v3 | 2023 | Tree-shakeable, 2KB per function vs 67KB monolith |

**Deprecated/outdated in this codebase's context:**
- `react-map-gl` (Mapbox): Requires API key, monthly cost at scale. Replaced by react-leaflet + OpenStreetMap for this use case.
- `react-router` v6 BrowserRouter wrapping the entire app: v7 supports `<Routes>` inside a `<BrowserRouter>` or the new framework mode. Use component mode for company-web.

---

## Open Questions

1. **Stripe Connect UAE — Current Status**
   - What we know: UAE Express is not self-serve; must contact Stripe (confirmed in PITFALLS.md and WebSearch). The blocker is pre-existing in STATE.md.
   - What's unclear: Whether Stripe has updated UAE support in early 2026. Whether the manual activation takes 1 day or 1 week.
   - Recommendation: Contact Stripe support at the start of Phase 2 before writing company onboarding code. Build the UI to show a "pending activation" state regardless. Do NOT block company dashboard functionality on Connect status.

2. **CarpetOrderDetails — lead_time_days for return date estimation**
   - What we know: The `CarpetOrderDetails` table exists in the schema. `return_date` is stored there.
   - What's unclear: The Company model has no `lead_time_days` field. The estimated return date (CARP-03) needs to be computed — but from what value?
   - Recommendation: Add `carpet_lead_time_days Int @default(5)` to the `Company` model (or per-category on `CompanyService`). Default to 5 days. Company configures this during onboarding. Planner should create a Prisma migration task for this field.

3. **Review aggregation (avg rating, review count) for company listing (DISC-04)**
   - What we know: The `Review` table exists. Prisma supports `_count` but not `_avg` across relations in a single `findMany` call without raw SQL.
   - What's unclear: Whether to add denormalized `avg_rating` + `review_count` columns to the `Company` model (updated via trigger or BullMQ job on new review) or to use a raw SQL query in the discovery endpoint.
   - Recommendation: Add `avg_rating Decimal @default(0)` and `review_count Int @default(0)` to Company model. Update them when a review is created. This keeps the company listing query simple and performant. Planner should include a migration task.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API, customer-web build, company-web build | Yes | v24.14.0 | — |
| pnpm (via npm global) | Monorepo workspaces | Yes (verified Phase 1) | — | — |
| Stripe account (UAE) | PAY-01, PAY-03, PAY-04, PAY-05 | Unknown — requires manual confirmation | — | Cannot proceed with PAY-04 until Stripe contact confirms UAE Connect status |
| Neon DB (Bahrain region) | All API routes | Yes (Phase 1 verified) | — | — |
| Upstash Redis (Fixed Plan) | BullMQ, Socket.io | Yes (Phase 1 verified) | — | — |
| Nominatim API (public) | BOOK-03 reverse geocoding | Yes (public HTTP API, no key) | — | Client shows raw lat/lng if Nominatim fails |
| OpenStreetMap tiles (via Stadia Maps) | react-leaflet map display | Requires account + domain whitelist | Free tier: 2,000 daily views | Use raw OSM tile URL for dev; register Stadia Maps for production |

**Missing dependencies with no fallback:**
- Stripe Connect UAE activation: must contact Stripe before any payout code is written (PAY-04, PAY-06 blocked until confirmed).

**Missing dependencies with fallback:**
- Stadia Maps account: raw OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) work without registration for development. Register for production to avoid tile provider ToS violation.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Enforced By |
|-----------|-------------|
| All prices in fils (integer, no floats) | Schema `Int` types; server computes amounts |
| Bilingual columns: `_en` / `_ar` pairs, both required | Zod schema `.min(1)` on both fields; Prisma `@db.Text` |
| CSS logical properties throughout (`ms-`, `me-`, `ps-`, `pe-`) | Code review; never `ml-`, `mr-`, `pl-`, `pr-` |
| `geography` type (not `geometry`) for GPS columns | Already in schema; no changes needed |
| Prisma with `@prisma/adapter-neon` for Fastify | Already in `apps/api/src/lib/prisma.ts` from Phase 1 |
| Upstash Redis Fixed Plan (not PAYG) for BullMQ | Infrastructure config — no code change |
| No `marginLeft`/`marginRight` in any component | Tailwind Tailwind logical property convention |
| Never `new PrismaClient()` inside request handlers | Singleton in `lib/prisma.ts` used everywhere |
| `fastify-type-provider-zod` (not `@fastify/type-provider-zod`) | Already established in Phase 1 |
| `node-linker=hoisted` in `.npmrc` for Expo native modules | Already configured in Phase 1 |
| Stripe Connect: use `destination_charges` not `on_behalf_of` | UAE restriction — enforced in Stripe service code |
| NEVER hand `amount` from client to PaymentIntent | Prices recomputed server-side from package IDs |
| Stripe webhook: verify signature with raw body | `@fastify/rawbody` + `constructEvent()` |
| BullMQ workers: implement `SIGTERM` handler for graceful shutdown | Required in `order.worker.ts` |
| BullMQ Stripe calls: always include idempotency key | `idempotencyKey: \`transfer-\${order_id}\`` |

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/CONTEXT7_VERIFIED.md` — Stripe Connect destination charges pattern, Socket.io rooms, Prisma Neon adapter, Next.js App Router i18n (verified via Context7 2026-03-31)
- `.planning/research/PITFALLS.md` — Stripe Connect UAE restriction, BullMQ idempotency, Prisma connection pooling, order race conditions
- `packages/db/schema.prisma` — Current schema: Order, OrderItem, CarpetOrderDetails, Company, Package, AddOn, Review, City confirmed
- `packages/types/src/index.ts` → order.ts — `isValidTransition()` + `VALID_TRANSITIONS` already implemented
- Stripe official docs (react.docs.stripe.com) — Payment Element, `constructEvent`, `reverse_transfer`

### Secondary (MEDIUM confidence)
- WebSearch: Stripe Connect UAE Express not self-serve (confirmed by multiple sources including Stripe's own support page)
- WebSearch: react-leaflet v5 — free, open-source, works with OSM tiles; `ssr: false` requirement confirmed
- npm registry: verified current package versions (all above) on 2026-04-02
- WebSearch: TanStack Router `0.0.1-beta.53` pre-release on npm — confirmed react-router v7 is the stable choice

### Tertiary (LOW confidence — validate before using)
- Nominatim 1 req/s limit: sufficient for drag-end events, but UAE Arabic address quality may vary. Validate address display quality before shipping BOOK-03.
- Stadia Maps free tier 2,000 daily views: sufficient for development and early launch. Monitor usage; upgrade plan as user count grows.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions npm-verified 2026-04-02; libraries are established choices from CLAUDE.md
- Architecture patterns: HIGH — build on Phase 1 established patterns (routes, plugins, Prisma singleton, BullMQ queues already scaffolded)
- Pitfalls: HIGH — sourced from PITFALLS.md (verified in Phase 1 research) + Phase 2-specific additions (rawbody, SSR map)
- Open questions: MEDIUM — Stripe UAE status and schema gaps are known unknowns requiring action before implementation

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack; Stripe UAE policy most likely to change — re-verify if >30 days pass)
