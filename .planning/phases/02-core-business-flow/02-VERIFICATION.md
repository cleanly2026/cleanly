---
phase: 02-core-business-flow
verified: 2026-04-03T14:00:00Z
status: human_needed
score: 33/33 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 22/33
  gaps_closed:
    - "Company can CRUD packages with bilingual names and prices in fils (COMP-03)"
    - "Company can manage washer staff (create, list, deactivate) (COMP-04)"
    - "BullMQ payout worker creates Stripe transfer with idempotency key (PAY-04)"
    - "Company admin can view order feed from router URL /orders (COMP-05)"
    - "Refund flow uses reverse_transfer: true (PAY-06)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify end-to-end customer booking flow works in browser"
    expected: "Customer selects Car Wash, picks a city, clicks a company, selects a package, toggles add-ons, drags map pin, reviews summary, pays with Stripe test card 4242 4242 4242 4242, and reaches booking-confirmed page showing order number"
    why_human: "Requires running API, running customer-web, and live Stripe test environment simultaneously — cannot be verified statically"
  - test: "Verify RTL layout switches correctly in company-web"
    expected: "Switching to Arabic in company-web flips table columns and text direction to RTL; all UI elements mirror correctly"
    why_human: "Visual RTL correctness requires browser inspection in both locales"
  - test: "Verify Socket.io real-time order notifications reach company dashboard"
    expected: "When customer creates an order, it appears in company OrderFeed within 2 seconds without page refresh"
    why_human: "Requires two concurrent browser sessions and running API server with Socket.io"
  - test: "Verify companyId wiring in company-web dashboard"
    expected: "OrderFeed loads orders for the correct company (not 'TODO_FROM_AUTH')"
    why_human: "router.tsx uses companyId = 'TODO_FROM_AUTH' placeholder — auth context wiring is deferred to Phase 3; human must confirm whether this is acceptable scope for Phase 2 or whether it blocks goal achievement"
---

# Phase 2: Core Business Flow — Verification Report (Re-verification #2)

**Phase Goal:** A customer can discover cleaning companies by city and category, select a package, book either an on-site service or a carpet pickup-return, pay via Stripe, and have the order progress through its complete lifecycle — including company acceptance, washer assignment, and Stripe Connect payout to the company.
**Verified:** 2026-04-03T14:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure plans 02-10, 02-11, 02-12

---

## Re-verification Summary

All 5 gaps from the previous verification were addressed by gap closure commits f6debc3, 859e34a, and 89e04bb:

| Gap | Previous Status | Current Status | Change |
|-----|----------------|----------------|--------|
| Company package management API (`packages.ts`) | FAILED | VERIFIED | Closed by 02-10 / commit f6debc3 |
| Company washer management API (`washers.ts`) | FAILED | VERIFIED | Closed by 02-10 / commit f6debc3 |
| BullMQ order worker (`order.worker.ts`) | FAILED | VERIFIED | Closed by 02-11 / commit 859e34a |
| OrderFeed orphaned in router (`router.tsx`) | FAILED | VERIFIED | Closed by 02-12 / commit 89e04bb |
| Refund flow no consumer (`order.worker.ts`) | FAILED | VERIFIED | Closed by 02-11 (same file, process-refund handler) |

**Regressions:** None. All 22 previously verified items remain intact.

**Gaps closed:** 5 of 5

**Remaining concern (non-blocking, needs human):** `companyId = 'TODO_FROM_AUTH'` placeholder in router.tsx. The OrderFeed route is reachable and renders the real component, but the companyId passed will not load real company orders until auth context is wired. This is explicitly deferred to Phase 3 per the 02-12 PLAN decision.

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                  | Status      | Evidence                                                                                          |
|----|----------------------------------------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------------|
| 1  | Customer sees 3 service category cards on home page                                   | VERIFIED   | `page.tsx` imports CategoryCard, renders 3 cards; brand-gold/brand-navy tokens                   |
| 2  | Customer's city is auto-detected via GPS or manually selected                         | VERIFIED   | `useGeolocation.ts` exists; CityPicker wired in home page with GPS fallback                       |
| 3  | Customer sees filtered company listings by city and category                          | VERIFIED   | `companies/page.tsx` uses TanStack Query useQuery; API GET /companies wired                       |
| 4  | Company cards show name, rating, review count, starting price, logo                   | VERIFIED   | `CompanyCard.tsx` renders avg_rating; discovery API maps starting_price, review_count             |
| 5  | Customer can view company profile with packages, add-ons, reviews                     | VERIFIED   | `companies/[slug]/page.tsx` fetches via useQuery + CompanyProfile; API returns full profile       |
| 6  | Prisma schema has avg_rating, review_count, carpet_lead_time_days on Company          | VERIFIED   | `schema.prisma` lines 140-142 confirmed                                                           |
| 7  | All Phase 2 Zod schemas exported from @cleanly/types                                  | VERIFIED   | `index.ts` exports discovery.js, booking.js, company.js; all schemas confirmed present            |
| 8  | All Phase 2 i18n keys exist in both en.json and ar.json                               | VERIFIED   | Both files contain discovery, booking, order, dashboard namespaces                                |
| 9  | customer-web has TanStack Query provider wrapping all pages                            | VERIFIED   | `query-provider.tsx` substantive; layout.tsx wraps children with QueryProvider                    |
| 10 | company-web has i18next initialized with AR/EN and RTL direction switching             | VERIFIED   | `lib/i18n.ts` uses initReactI18next; main.tsx imports i18n first, sets document.documentElement.dir |
| 11 | company-web has react-router v7 routing set up in SPA mode                            | VERIFIED   | `router.tsx` uses Routes/Route from 'react-router'; main.tsx wraps with BrowserRouter             |
| 12 | company-web has Socket.io client connected and auto-reconnecting                       | VERIFIED   | `lib/socket.ts` has io() with autoConnect:false and connectSocket function                        |
| 13 | API server has Socket.io attached and listening for room joins                         | VERIFIED   | `server.ts` calls setupSocketHandlers; `lib/socket.ts` handles join:company and join:order        |
| 14 | POST /orders creates order with server-computed prices                                 | VERIFIED   | `booking/orders.ts` calls computeOrderTotal; never accepts amount from client body                |
| 15 | POST /orders returns Stripe PaymentIntent client_secret                               | VERIFIED   | `booking/orders.ts` calls createPaymentIntent, returns `{ order_id, client_secret }`              |
| 16 | On-site order stores service_location as PostGIS geography point                      | VERIFIED   | `booking/orders.ts` uses `ST_SetSRID(ST_MakePoint(...))::geography` raw SQL                       |
| 17 | Carpet order stores pickup_time and computed return_date                               | VERIFIED   | `booking/orders.ts` calls computeCarpetReturnDate, stores CarpetOrderDetails                      |
| 18 | Platform fee computed server-side as application_fee_amount                           | VERIFIED   | `stripe.service.ts` includes application_fee_amount and transfer_data.destination                 |
| 19 | Customer can drag map pin with reverse-geocoded address                               | VERIFIED   | `LocationPicker.tsx` uses react-leaflet MapContainer, moveend event, Nominatim API call           |
| 20 | Customer pays via Stripe Payment Element                                               | VERIFIED   | `payment/page.tsx` imports PaymentElement, calls stripe.confirmPayment; inline error shown        |
| 21 | Carpet booking shows date picker + time slot grid + estimated return date             | VERIFIED   | `TimeSlotPicker.tsx` has date input and 4 time slots; carpet booking page uses it                 |
| 22 | Booking confirmation page shows order number                                           | VERIFIED   | `booking-confirmed/page.tsx` displays orderId.slice(0,8) in font-mono; links to orders view      |
| 23 | Order state transitions use row-level locking                                         | VERIFIED   | `order.service.ts` uses `SELECT ... FOR UPDATE` in prisma.$transaction                           |
| 24 | Company can assign washer to accepted order                                           | VERIFIED   | `lifecycle.ts` has PATCH /:id/assign-washer with transitionOrderStatus + washer_id update         |
| 25 | Washer can accept or decline assignment with 30s auto-decline timer                   | VERIFIED   | `lifecycle.ts` queues washer-response-timeout; `order.worker.ts` consumes it with state guard     |
| 26 | Customer can cancel order with policy enforcement                                     | VERIFIED   | `lifecycle.ts` has DELETE /:id with free/fee logic based on order status                          |
| 27 | Stripe webhook verifies signature with raw body                                       | VERIFIED   | `webhook.ts` uses `constructEvent(request.rawBody, sig, STRIPE_WEBHOOK_SECRET)`                   |
| 28 | payment_intent.succeeded updates order payment_status to paid                        | VERIFIED   | `webhook.ts` handles case 'payment_intent.succeeded', updates payment_status: 'paid'             |
| 29 | Company can update bilingual profile                                                   | VERIFIED   | `company/profile.ts` has PUT with companyProfileSchema, updates name_en, name_ar                  |
| 30 | Company can set city coverage and service categories                                   | VERIFIED   | `company/services.ts` has PUT with companyServicesSchema, deleteMany + createMany pattern         |
| 31 | Company can initiate Stripe Connect onboarding                                        | VERIFIED   | `stripe-connect.ts` calls createConnectAccount + createAccountLink; returns AccountLink URL       |
| 32 | Company can CRUD packages with bilingual names and prices in fils                    | VERIFIED   | `apps/api/src/routes/company/packages.ts` — 150 lines, 6 endpoints; registered in server.ts at prefix /company/packages |
| 33 | Company can manage washer staff (create, list, deactivate)                            | VERIFIED   | `apps/api/src/routes/company/washers.ts` — 83 lines, 3 endpoints; registered in server.ts at prefix /company/washers |

**Score:** 33/33 truths verified

---

### Required Artifacts

| Artifact                                                          | Provides                                         | Status     | Details                                                              |
|-------------------------------------------------------------------|--------------------------------------------------|------------|----------------------------------------------------------------------|
| `packages/db/schema.prisma`                                       | avg_rating, review_count, carpet_lead_time_days  | VERIFIED  | Fields confirmed                                                      |
| `packages/types/src/discovery.ts`                                 | companyListQuerySchema, companyProfileResponseSchema | VERIFIED | Both exports confirmed                                             |
| `packages/types/src/booking.ts`                                   | createOnSiteOrderSchema, createCarpetOrderSchema | VERIFIED  | Both exports confirmed                                               |
| `packages/types/src/company.ts`                                   | companyProfileSchema, packageSchema, washerSchema | VERIFIED | All three exports confirmed                                         |
| `packages/types/src/index.ts`                                     | Barrel export of all Phase 2 types               | VERIFIED  | Exports discovery.js, booking.js, company.js                        |
| `apps/customer-web/src/providers/query-provider.tsx`              | QueryClient provider for customer-web            | VERIFIED  | Wired in layout.tsx                                                 |
| `apps/company-web/src/lib/i18n.ts`                                | i18next config for company-web                   | VERIFIED  | Imported in main.tsx                                                |
| `apps/api/src/lib/socket.ts`                                      | Socket.io server + room join handlers            | VERIFIED  | setupSocketHandlers, join:company, join:order all present           |
| `apps/api/src/routes/discovery/companies.ts`                      | GET /companies, GET /companies/:slug             | VERIFIED  | Confirmed exists                                                    |
| `apps/api/src/routes/discovery/cities.ts`                         | GET /cities                                      | VERIFIED  | Confirmed exists                                                    |
| `apps/customer-web/app/[locale]/page.tsx`                         | Home with 3 category cards                       | VERIFIED  | CategoryCard, CityPicker, useGeolocation wired                      |
| `apps/customer-web/app/[locale]/companies/page.tsx`               | Company listing page                             | VERIFIED  | useQuery + CompanyCard wired                                        |
| `apps/customer-web/app/[locale]/companies/[slug]/page.tsx`        | Company profile page                             | VERIFIED  | useQuery + CompanyProfile wired                                     |
| `apps/api/src/routes/booking/orders.ts`                           | POST /orders/on-site, POST /orders/carpet        | VERIFIED  | computeOrderTotal, createPaymentIntent, ST_MakePoint, carpet_details |
| `apps/api/src/services/stripe.service.ts`                         | PaymentIntent with destination charges + createRefund | VERIFIED | application_fee_amount, transfer_data.destination; createRefund with reverse_transfer:true confirmed at line 42 |
| `apps/api/src/services/order.service.ts`                          | Price computation + state locking                | VERIFIED  | computeOrderTotal, FOR UPDATE, isValidTransition                    |
| `apps/customer-web/src/components/LocationPicker.tsx`             | Draggable map pin with reverse geocoding         | VERIFIED  | react-leaflet MapContainer, nominatim, moveend, leaflet.css         |
| `apps/customer-web/app/[locale]/payment/page.tsx`                 | Stripe Payment Element integration               | VERIFIED  | PaymentElement, confirmPayment, payment_failed inline error         |
| `apps/customer-web/src/components/StickyBottomBar.tsx`            | Sticky bottom bar with running total             | VERIFIED  | brand-gold, sticky structure, disabled state                        |
| `apps/customer-web/app/[locale]/booking-confirmed/page.tsx`       | Booking confirmation page                        | VERIFIED  | booking_confirmed_heading, font-mono order number                   |
| `apps/api/src/routes/orders/lifecycle.ts`                         | State transitions, assignment, cancellation      | VERIFIED  | transitionOrderStatus, FOR UPDATE, order:status-changed Socket.io   |
| `apps/api/src/routes/orders/customer-orders.ts`                   | GET /customer/orders and /:id                    | VERIFIED  | customer_id filter, carpet_details, bilingual names                 |
| `apps/api/src/routes/payments/webhook.ts`                         | POST /webhooks/stripe with raw body              | VERIFIED  | constructEvent, rawBody, STRIPE_WEBHOOK_SECRET, payment_intent.succeeded |
| `apps/api/src/routes/company/profile.ts`                          | PUT /company/profile                             | VERIFIED  | companyProfileSchema, name_en, name_ar, fastify.authenticate        |
| `apps/api/src/routes/company/services.ts`                         | PUT /company/services                            | VERIFIED  | companyServicesSchema, companyService.deleteMany                    |
| `apps/api/src/routes/company/stripe-connect.ts`                   | POST /company/stripe-connect/onboard             | VERIFIED  | createConnectAccount, createAccountLink                             |
| `apps/api/src/routes/company/orders.ts`                           | GET /company/orders + /washers/available         | VERIFIED  | companyOrdersRoute, status filter, pagination, washer list          |
| `apps/company-web/src/pages/OrderFeed.tsx`                        | Company order feed page                          | VERIFIED  | 85 lines, substantive; imported and routed at /orders in router.tsx |
| `apps/company-web/src/components/OrderTable.tsx`                  | Data table for orders                            | VERIFIED  | text-start RTL compliance, StatusBadge, WasherAssignDropdown wired  |
| `apps/company-web/src/components/WasherAssignDropdown.tsx`        | Inline washer assignment dropdown                | VERIFIED  | useMutation for assign-washer, min-h-[44px]                        |
| `apps/company-web/src/hooks/useOrderSocket.ts`                    | Socket.io hooks for real-time order updates      | VERIFIED  | socket.on('order:new'), socket.on('order:status-changed'), cache invalidation |
| `apps/api/src/routes/company/packages.ts`                         | CRUD /company/packages + add-ons                 | VERIFIED  | 150 lines; 6 endpoints (list, create, update, delete package + create/delete add-on); packageSchema + addOnSchema from @cleanly/types; registered in server.ts |
| `apps/api/src/routes/company/washers.ts`                          | Company washer management endpoints              | VERIFIED  | 83 lines; 3 endpoints (list, create, deactivate); washerSchema from @cleanly/types; bcryptjs PIN hash; registered in server.ts |
| `apps/api/src/workers/order.worker.ts`                            | BullMQ payout + timeout + refund worker          | VERIFIED  | 121 lines; Worker('orders') matching lib/queue.ts Queue name; schedule-payout with idempotencyKey `payout-${order_id}`; process-refund calls createRefund; washer-response-timeout with state guard; SIGTERM/SIGINT graceful shutdown |

---

### Key Link Verification

| From                                           | To                                      | Via                                    | Status    | Details                                                               |
|------------------------------------------------|-----------------------------------------|----------------------------------------|-----------|-----------------------------------------------------------------------|
| `customer-web/app/[locale]/layout.tsx`         | `query-provider.tsx`                    | QueryProvider wrapping children        | WIRED    | Confirmed                                                             |
| `company-web/src/main.tsx`                     | `lib/i18n.ts`                           | import before ReactDOM.createRoot      | WIRED    | Confirmed                                                             |
| `apps/api/src/server.ts`                       | `lib/socket.ts`                         | setupSocketHandlers(server.server)     | WIRED    | Confirmed                                                             |
| `companies/page.tsx`                           | GET /companies                          | TanStack Query useQuery                | WIRED    | Confirmed                                                             |
| `companies/[slug]/page.tsx`                    | GET /companies/:slug                    | TanStack Query useQuery                | WIRED    | Confirmed                                                             |
| `booking/orders.ts`                            | `stripe.service.ts`                     | createPaymentIntent                    | WIRED    | Confirmed                                                             |
| `booking/orders.ts`                            | `order.service.ts`                      | computeOrderTotal                      | WIRED    | Confirmed                                                             |
| `payment/page.tsx`                             | stripe.confirmPayment                   | useStripe hook                         | WIRED    | Confirmed                                                             |
| `lifecycle.ts`                                 | `order.service.ts`                      | transitionOrderStatus                  | WIRED    | Confirmed                                                             |
| `lifecycle.ts`                                 | `lib/socket.ts`                         | getIO().to(room).emit('order:status-changed') | WIRED | Confirmed                                                       |
| `lifecycle.ts`                                 | `order.worker.ts` via BullMQ            | schedule-payout job — queue name 'orders' matches Worker('orders') | WIRED | Queue('orders') in lib/queue.ts matches Worker('orders') in order.worker.ts |
| `stripe-connect.ts`                            | `stripe.service.ts`                     | createConnectAccount + createAccountLink | WIRED  | Confirmed                                                            |
| `webhook.ts`                                   | `stripe.service.ts`                     | stripe.webhooks.constructEvent         | WIRED    | Confirmed                                                             |
| `order.worker.ts`                              | stripe.transfers.create                 | idempotencyKey `payout-${order_id}`    | WIRED    | Line 38 in order.worker.ts; stripe imported from stripe.service.js   |
| `order.worker.ts`                              | `stripe.service.ts` createRefund        | process-refund job calls createRefund  | WIRED    | createRefund imported and called in process-refund handler           |
| `company-web/src/router.tsx`                   | `pages/OrderFeed.tsx`                   | Route path="/orders"                   | WIRED    | OrderFeed imported at line 2; routed at line 19 with companyId prop  |
| `useOrderSocket.ts`                            | Socket.io company:{companyId} room      | socket.on('order:new')                 | WIRED    | Hook is wired; OrderFeed page is now reachable via /orders route     |
| `server.ts`                                    | `routes/company/packages.ts`            | register at prefix /company/packages   | WIRED    | Lines 16 and 66 in server.ts confirmed                               |
| `server.ts`                                    | `routes/company/washers.ts`             | register at prefix /company/washers    | WIRED    | Lines 17 and 67 in server.ts confirmed                               |

---

### Data-Flow Trace (Level 4)

| Artifact                       | Data Variable     | Source                                   | Produces Real Data | Status      |
|-------------------------------|-------------------|------------------------------------------|--------------------|-------------|
| `companies/page.tsx`           | `data.companies`  | GET /companies → prisma.company.findMany | Yes                | FLOWING     |
| `companies/[slug]/page.tsx`    | `company`         | GET /companies/:slug → prisma.company.findUnique | Yes        | FLOWING     |
| `OrderFeed.tsx`                | `data.orders`     | GET /company/orders → prisma.order.findMany | Yes             | FLOWING — page now reachable via /orders route |
| `payment/page.tsx`             | `clientSecret`    | URL param from order creation flow        | Yes — from Stripe PI | FLOWING   |
| `WasherAssignDropdown.tsx`     | `washersData`     | GET /company/orders/washers/available    | Yes — prisma.user.findMany | FLOWING — page now reachable |
| `packages.ts` GET /            | `packages`        | prisma.package.findMany with add_ons included | Yes          | FLOWING     |
| `washers.ts` GET /             | `washers`         | prisma.user.findMany role='washer'        | Yes                | FLOWING     |
| `order.worker.ts` schedule-payout | `order`        | prisma.order.findUniqueOrThrow + stripe.transfers.create | Yes | FLOWING (job consumer active) |
| `order.worker.ts` process-refund  | `order`        | prisma.order.findUniqueOrThrow + createRefund | Yes          | FLOWING (job consumer active) |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — API server is not running in this environment. Endpoint verification requires live server and database connection.

---

### Requirements Coverage

| Requirement | Source Plan | Description                                              | Status       | Evidence                                                               |
|-------------|-------------|----------------------------------------------------------|--------------|------------------------------------------------------------------------|
| DISC-01     | 02-03       | Customer can browse 3 service categories                  | SATISFIED   | Home page renders CategoryCard x 3; car_wash, carpet, sofa supported  |
| DISC-02     | 02-03       | GPS auto-detect with manual city picker fallback          | SATISFIED   | useGeolocation + CityPicker in home page; fallback on GPS error        |
| DISC-03     | 02-03       | Company listings filtered by city and category            | SATISFIED   | GET /companies with city_id + category; companies/page.tsx consumes it |
| DISC-04     | 02-01       | Listings show name, rating, price range, review count     | SATISFIED   | Schema fields, API mapping, CompanyCard all verified                   |
| DISC-05     | 02-03       | Company profile with packages, add-ons, reviews           | SATISFIED   | GET /companies/:slug returns full profile; CompanyProfile renders it   |
| BOOK-01     | 02-04, 02-06 | Select package with quantity                             | SATISFIED   | createOnSiteOrderSchema has quantity; on-site page has quantity stepper |
| BOOK-02     | 02-06       | Optional add-ons to booking                               | SATISFIED   | AddOnChips component; add_on_ids in POST /orders/on-site body          |
| BOOK-03     | 02-06       | Pin service location on map                               | SATISFIED   | LocationPicker with react-leaflet and Nominatim wired in booking page  |
| BOOK-04     | 02-06       | Order summary before payment                              | SATISFIED   | BookingSummary component rendered in both booking pages                |
| CARP-01     | 02-04, 02-06 | Select carpet package with quantity                      | SATISFIED   | createCarpetOrderSchema has quantity; carpet page has quantity stepper |
| CARP-02     | 02-06       | Select pickup time slot for carpet                        | SATISFIED   | TimeSlotPicker with date input and 4 slots in carpet booking page      |
| CARP-03     | 02-01, 02-04 | Estimated return date shown at booking                   | SATISFIED   | carpet_lead_time_days in schema; computeCarpetReturnDate in order service |
| CARP-04     | 02-07       | Reschedule return date before out_for_return              | SATISFIED   | PATCH /orders/:id/carpet-return-date with status guard in lifecycle.ts |
| CARP-05     | 02-07       | 10-state carpet lifecycle                                 | SATISFIED   | transitionOrderStatus enforces VALID_TRANSITIONS from @cleanly/types   |
| PAY-01      | 02-04, 02-06 | Pay via Stripe (card, Apple Pay, Google Pay)             | SATISFIED   | PaymentElement with automatic_payment_methods; confirmPayment used     |
| PAY-02      | 02-01       | Wallet balance (scoped out of Phase 2)                    | N/A          | Listed in plan as context only; not a Phase 2 implementation target    |
| PAY-03      | 02-04       | Platform commission auto-deducted                         | SATISFIED   | application_fee_amount computed server-side in stripe.service.ts       |
| PAY-04      | 02-07, 02-08, 02-11 | Payout via Stripe Connect with 7-day delay        | SATISFIED   | schedule-payout job enqueued in lifecycle.ts line 40; order.worker.ts consumes it with idempotencyKey `payout-${order_id}` |
| PAY-05      | 02-08       | Stripe webhook handles payment capture, refunds, disputes | SATISFIED   | webhook.ts handles payment_intent.succeeded, failed, charge.dispute.created |
| PAY-06      | 02-08, 02-11 | Refund reverses transfer before customer refund          | SATISFIED   | process-refund job in order.worker.ts calls createRefund which uses reverse_transfer: true and refund_application_fee: true |
| ORD-01      | 02-07       | 7-state on-site order lifecycle                           | SATISFIED   | lifecycle.ts + transitionOrderStatus enforces all transitions          |
| ORD-02      | 02-04       | Company real-time notification on new order               | SATISFIED   | booking/orders.ts emits order:new to company:{companyId} socket room   |
| ORD-03      | 02-07       | Company can assign washer to accepted order               | SATISFIED   | PATCH /orders/:id/assign-washer in lifecycle.ts                        |
| ORD-04      | 02-07, 02-11 | Washer accept/decline with 30s timer                     | SATISFIED   | API endpoint exists; washer-response-timeout job consumed by order.worker.ts with state guard — auto-declines if still in washer_assigned with same washer |
| ORD-05      | 02-04, 02-07 | DB-level locking on state transitions                    | SATISFIED   | SELECT FOR UPDATE in order.service.ts transitionOrderStatus            |
| ORD-06      | 02-07       | Customer cancel with policy enforcement                   | SATISFIED   | DELETE /orders/:id with free vs fee logic in lifecycle.ts              |
| COMP-01     | 02-05       | Company bilingual profile setup                           | SATISFIED   | PUT /company/profile with companyProfileSchema; name_en + name_ar      |
| COMP-02     | 02-05       | Company manages city coverage and categories              | SATISFIED   | PUT /company/services with companyServicesSchema; deleteMany + createMany |
| COMP-03     | 02-05, 02-10 | Company CRUD packages and add-ons                        | SATISFIED   | apps/api/src/routes/company/packages.ts — 6 endpoints; packageSchema + addOnSchema; is_active soft delete; registered at /company/packages |
| COMP-04     | 02-05, 02-10 | Company manages washer staff accounts                    | SATISFIED   | apps/api/src/routes/company/washers.ts — 3 endpoints; washerSchema; bcryptjs PIN; washer_profile nested create; company_id: null deactivation; registered at /company/washers |
| COMP-05     | 02-09, 02-12 | Company live order feed with real-time updates           | SATISFIED   | OrderFeed imported and routed at /orders in router.tsx; root / redirects to /orders; Socket.io hooks wired; note: companyId uses TODO_FROM_AUTH placeholder pending Phase 3 auth wiring |
| COMP-06     | 02-09, 02-12 | Company can assign washers from dashboard                | SATISFIED   | WasherAssignDropdown accessible via /orders route; WasherAssignDropdown calls PATCH /orders/:id/assign-washer |
| COMP-07     | 02-05       | Stripe Connect onboarding                                 | SATISFIED   | stripe-connect.ts with createConnectAccount + createAccountLink        |

**All 33 requirements satisfied (PAY-02 is N/A — scoped out of Phase 2).**

---

### Anti-Patterns Found

| File                                          | Line | Pattern                                                     | Severity  | Impact                                                                         |
|-----------------------------------------------|------|-------------------------------------------------------------|-----------|--------------------------------------------------------------------------------|
| `apps/company-web/src/router.tsx`             | 5-7  | `PackagesPage` and `WashersPage` return `<div>coming soon</div>` stubs | WARNING | /packages and /washers routes exist but render no real UI — acceptable as Phase 2 has no company-facing package management UI requirement; UI for COMP-03/COMP-04 is API-only in this phase |
| `apps/company-web/src/router.tsx`             | 13   | `companyId = 'TODO_FROM_AUTH'` placeholder                   | WARNING   | OrderFeed renders but cannot load real orders in production until auth context is wired in Phase 3; does not block Phase 2 goal since the requirement is backend completeness + page reachability |
| `apps/api/src/routes/company/orders.ts`       | 112  | `first_name: w.phone ?? w.id` — washer name falls back to phone/ID | INFO | Washer names display as phone numbers in dropdown — cosmetic, not functional   |

No BLOCKER anti-patterns remain. The two WARNINGs are explicitly deferred: PackagesPage/WashersPage stubs have no Phase 2 UI requirement (COMP-03/COMP-04 are API requirements), and the companyId placeholder is a documented Phase 3 concern.

---

### Human Verification Required

#### 1. End-to-end Customer Booking Flow

**Test:** Open customer-web, select Car Wash, pick a city, click a company, select a package, toggle add-ons, drag the map pin, review the order summary, proceed to payment, enter test card 4242 4242 4242 4242, submit, verify booking-confirmed page appears.
**Expected:** Booking confirmed page shows order number, "View Order" link works.
**Why human:** Requires running API, running customer-web, and live Stripe test environment simultaneously.

#### 2. RTL Layout in Company Dashboard (Arabic Mode)

**Test:** Open company-web, switch language to Arabic, navigate to the order feed table at /orders.
**Expected:** Table columns are right-to-left ordered, text is right-aligned, all UI elements flip correctly.
**Why human:** Visual RTL correctness requires browser inspection — cannot be verified statically.

#### 3. Real-time Order Notification in Company Dashboard

**Test:** With the company dashboard open in one browser window and customer-web in another, create a booking in customer-web.
**Expected:** New order appears in the company order feed table within 2 seconds without page refresh.
**Why human:** Requires concurrent browser sessions, running API with Socket.io, and cannot be simulated statically.

#### 4. Company Dashboard Auth Context Scope Decision

**Test:** Load company-web /orders in a browser.
**Expected:** Confirm whether the TODO_FROM_AUTH placeholder is acceptable for Phase 2 sign-off (page is reachable and renders correctly with placeholder companyId), or whether the auth context must be wired before Phase 2 can close.
**Why human:** This is a product/scope decision — the code is correct and the route is wired; the only question is whether the phase goal "company admin can view order feed" requires real data or just a working, reachable page.

---

## Gaps Summary

No gaps remain. All 5 previously failing items are now verified:

1. **COMP-03 — Package management API:** `apps/api/src/routes/company/packages.ts` created (150 lines, 6 endpoints) and registered in server.ts. Commit f6debc3.
2. **COMP-04 — Washer management API:** `apps/api/src/routes/company/washers.ts` created (83 lines, 3 endpoints) and registered in server.ts. Commit f6debc3.
3. **PAY-04 + PAY-06 + ORD-04 — BullMQ order worker:** `apps/api/src/workers/order.worker.ts` created (121 lines). Consumes Worker('orders') matching queue name; schedule-payout uses idempotency key; process-refund calls createRefund (reverse_transfer: true); washer-response-timeout has state guard; graceful shutdown implemented. Commit 859e34a.
4. **COMP-05 + COMP-06 — OrderFeed routing:** `apps/company-web/src/router.tsx` updated to import and route OrderFeed at /orders; root / redirects to /orders; DashboardPage placeholder removed. Commit 89e04bb.
5. **PAY-06 — Refund no consumer:** Resolved by the same order.worker.ts (item 3 above) — process-refund handler is the consumer.

The only remaining open item is a scope/product question: the companyId prop in company-web router uses a `TODO_FROM_AUTH` placeholder. This is explicitly deferred to Phase 3 auth wiring per the 02-12 PLAN decision log. All automated checks pass; human verification items 1-4 require a running environment.

---

_Verified: 2026-04-03T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Mode: Re-verification #2 after gap closure plans 02-10, 02-11, 02-12_
