# Pitfalls Research

**Domain:** On-demand cleaning services marketplace (Gulf region, bilingual AR/EN, 5 app surfaces)
**Researched:** 2026-03-30
**Confidence:** HIGH (multiple authoritative sources, domain-specific verification)

---

## Critical Pitfalls

### Pitfall 1: Stripe Connect UAE — Express Accounts Require Manual Onboarding

**What goes wrong:**
Stripe Connect in UAE does not allow platform users to self-serve Express connected accounts. Companies trying to onboard to receive payouts must go through a manual process with Stripe — they cannot complete onboarding independently via the standard hosted onboarding link that works in other countries. This breaks the automated company onboarding flow that most tutorials and the standard Stripe Connect implementation assume.

**Why it happens:**
Most Stripe Connect tutorials are written for US/EU markets where Express onboarding is fully self-serve. Developers build the onboarding flow assuming `AccountLink` hosted onboarding works end-to-end, then discover in production (or late in development) that UAE requires Stripe's direct involvement.

Additionally, UAE platforms can only use `destination_charges` and `separate charges and transfers` — `on_behalf_of` with destination charges is not supported, which affects how charge metadata and statement descriptors appear to customers.

**How to avoid:**
- Contact Stripe directly before building the company onboarding flow to confirm current UAE Connect capabilities and the exact onboarding path.
- Design the company onboarding flow to accommodate manual steps (email Stripe, wait for approval) rather than assuming instant self-serve activation.
- Build the UI so companies can complete profile setup while their Stripe onboarding is pending — don't gate all company functionality on Stripe activation.
- Use `separate charges and transfers` (not `on_behalf_of`) as the payout model for UAE.
- Test with UAE test accounts specifically, not default US test accounts.

**Warning signs:**
- Onboarding link generated but company completes it and payout capability never activates.
- `account.updated` webhooks arriving with `requirements.currently_due` fields that never clear.
- Payouts to connected accounts returning 400 errors about account capability not being enabled.

**Phase to address:**
Phase 1 (Foundation) — Account setup and Stripe Connect architecture decisions must be validated before any payout code is written.

---

### Pitfall 2: Stripe Connect Refund and Dispute Clawback from Platform Account

**What goes wrong:**
When a customer disputes a charge or receives a refund, Stripe deducts the full amount from the platform account — even if that money has already been transferred to the connected company account. The platform eats the loss while the company has already received their payout. For a 15-20% commission model, a disputed AED 300 order means the platform absorbs the full AED 300, not just AED 45-60.

**Why it happens:**
Developers focus on the "happy path" — payment received, commission taken, remainder transferred to company. The reversal path (dispute, refund, cancellation) is implemented as an afterthought, usually after the first real dispute hits.

**How to avoid:**
- Implement a payout delay (7-14 days after service completion) before transferring to connected accounts, giving a window to handle disputes before money leaves the platform.
- Store transfer metadata linking every charge to its associated transfer so reversals can trigger clawbacks.
- Implement `transfer_reversal` logic for refunds — reverse the transfer first, then issue the refund.
- Configure Stripe webhook handlers for `charge.dispute.created`, `charge.refund.updated`, and `transfer.reversed` from day 1.
- Build a "funds on hold" period into the UX — tell companies upfront that payouts clear X days after service completion.

**Warning signs:**
- Transfer executed immediately at payment capture rather than at service completion.
- No webhook handler for `charge.dispute.created`.
- Refund flow issues platform refund without first checking/reversing associated transfer.

**Phase to address:**
Phase 2 (Payments) — Payout timing and dispute logic must be designed before the payment system is built, not retrofitted.

---

### Pitfall 3: RTL/Arabic Layout Breaks When Added Late — Non-Retrofittable

**What goes wrong:**
RTL layout is not simply flipping text direction. It requires that every component uses `start`/`end` instead of `left`/`right` for margins, paddings, and positioning. Icons need mirroring. Flex direction reverses. Number formatting changes. Arabic plural forms have 6 forms vs. English's 2. Absolute positioning breaks entirely. If this is not built from day 1, every component must be manually audited and rewritten. The effort to retrofit RTL into a 50-component codebase is 3-5x the effort of building it correctly from the start.

**Why it happens:**
Developers build in English first and say "we'll add Arabic translation and RTL later." This works for simple text replacement but fails completely for layout because CSS properties like `marginLeft: 16` are baked into dozens of components with no systematic way to invert them.

**How to avoid:**
- From the first component written, use `marginStart`/`marginEnd`/`paddingStart`/`paddingEnd` exclusively — never `marginLeft`/`marginRight`/`paddingLeft`/`paddingRight`.
- Set up `i18next` + `react-i18next` with Arabic translation keys from the first component — even placeholder values.
- Use `I18nManager.isRTL` for any conditional layout logic from day 1.
- In React Native, call `I18nManager.forceRTL(true)` in a test build early to verify all components handle RTL before the codebase grows.
- For Next.js, set `dir="rtl"` on the HTML element and use CSS logical properties (`margin-inline-start`, `padding-inline-end`) throughout.
- Create a shared design token system with RTL-aware spacing that both web and mobile inherit.
- Note that `forceRTL(false)` does not override device language on iOS/Android — if the device is set to Arabic, the app will be RTL regardless. Test on actual Arabic-locale devices.

**Warning signs:**
- Any component using `marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`, `left:`, `right:` in styles (in React Native).
- Text alignment using `textAlign: 'left'` rather than `textAlign: 'auto'` or locale-aware values.
- Icons rendered as `<Image>` without RTL mirroring logic.
- Translation keys added only when a feature is "done."

**Phase to address:**
Phase 1 (Foundation) — The monorepo shared packages must establish RTL infrastructure and conventions before any UI component is written.

---

### Pitfall 4: GPS Background Tracking Killed by OS on Both iOS and Android

**What goes wrong:**
In Expo managed workflow, background location tracking stops when the app is killed on both iOS and Android. On Android, manufacturer power-saving (Samsung, Xiaomi, OnePlus) aggressively kills background processes more than stock Android. On iOS, background tasks have a ~30 second execution window. For a washer app where the GPS must transmit continuously during a job, this means the customer's real-time tracking view goes dark mid-service.

**Why it happens:**
The `expo-location` background task works in Expo Go during development. Developers test there, it works, they ship. In production with real devices and real power management, the OS kills the task. The issue only surfaces in production under battery-saving conditions.

**How to avoid:**
- Use a persistent foreground notification (Android Foreground Service) for the washer GPS tracking — this keeps the process alive on Android at the cost of a visible notification. This is the only reliable approach.
- For iOS, use significant location change API (`startSignificantLocationChangesAsync`) for coarse tracking and accept that fine-grained continuous tracking is OS-restricted.
- Consider `react-native-background-geolocation` (transistorsoft) which handles foreground service setup automatically — it is the production-proven library for this use case.
- Design the customer-facing tracking view to gracefully handle GPS gaps — show "last known location" with timestamp, don't just freeze.
- Implement server-side "last seen" timestamp so the customer UI can show "Washer GPS lost — last seen 3 min ago" rather than infinite loading.
- Set `timeInterval` to 10+ seconds (not continuous) and use `Accuracy.Balanced` (not `Highest`) to prevent battery-triggered kills.
- Test background tracking on a real Samsung Galaxy and real iPhone with Low Power Mode enabled before shipping.

**Warning signs:**
- GPS tracking only tested in Expo Go, not a production build.
- Tracking code using `watchPositionAsync` without a foreground service notification on Android.
- No "GPS offline" state in the customer tracking UI.
- Location update interval set to under 5 seconds.

**Phase to address:**
Phase 3 (Tracking) — The washer GPS system must be built as a production build with real device testing, not as an Expo Go prototype.

---

### Pitfall 5: Order State Machine Race Conditions — Double Acceptance and Invalid Transitions

**What goes wrong:**
Two washers from the same company both accept the same order simultaneously (race condition at the database level). Or a customer cancels an order at the same moment the washer marks it as "en route" — the system allows both transitions and the order ends up in an undefined state. With 7 order statuses and multiple actors (customer, washer, company, system), the number of possible concurrent state transitions is high.

**Why it happens:**
State transition logic implemented at the application layer with no database-level locking. Developers test one user at a time, where race conditions never appear. Production with real concurrent users exposes them immediately.

**How to avoid:**
- Implement order state transitions using PostgreSQL `FOR UPDATE SKIP LOCKED` to lock the order row during transition evaluation.
- Use optimistic locking with a `version` column on the `orders` table — increment on every state change, reject the transition if the version doesn't match expected.
- Define a strict state transition matrix (allowed `from` → `to` pairs) and enforce it at the database level via a CHECK constraint or trigger, not just in application code.
- Use BullMQ to serialize state transitions for the same order through a per-order queue, preventing concurrent processing.
- Define cancellation windows explicitly — after "washer en route" state, cancellation either is blocked or triggers a cancellation fee flow, never a silent nullification.
- Log every state transition attempt (including rejected ones) for debugging.

**Warning signs:**
- State transition logic is purely `UPDATE orders SET status = $1 WHERE id = $2` with no version check or lock.
- No explicit allowed-transitions matrix (only "set to any status at any time" logic).
- No test for concurrent requests hitting the same order endpoint.
- Cancelled orders appearing in "in progress" company dashboards.

**Phase to address:**
Phase 2 (Order Management) — The state machine and database locking strategy must be established when the orders table and transition endpoints are first built.

---

### Pitfall 6: Socket.io Real-Time Tracking Doesn't Scale Past One Server Instance

**What goes wrong:**
Socket.io maintains connection state in-memory. When a second server instance is deployed (or Vercel serverless handles different requests), a customer's WebSocket connection lands on Server A while their washer's GPS updates are emitted on Server B. The customer never receives the updates. This is invisible in single-instance development and only breaks in production under load or after any horizontal scaling.

**Why it happens:**
Socket.io's default configuration works perfectly on one instance. The Redis adapter is documented but treated as a "later" optimization. By the time the problem is discovered, the architecture is locked.

**How to avoid:**
- Use `@socket.io/redis-adapter` from the first production deployment, even on a single instance — this makes horizontal scaling a configuration change rather than an architectural change.
- Use Socket.io rooms keyed by `orderId` — both the washer (emitter) and customer (listener) join the same room, so broadcasting to the room guarantees delivery regardless of which server instance handles the connection.
- For the GPS tracking specifically, consider an alternative: washer app POSTs location to REST endpoint → server broadcasts to room via Redis pub/sub. This is more resilient than a persistent WebSocket from the washer.
- Do not use Vercel Serverless/Edge for the Socket.io server — WebSockets require persistent processes. Deploy to Railway, Render, or a VPS.
- Set Redis `maxmemory-policy` to `noeviction` — if Redis evicts Socket.io keys under memory pressure, all rooms and connections are silently broken.

**Warning signs:**
- Socket.io server deployed on Vercel Serverless.
- No Redis adapter configured.
- Real-time updates work in localhost but fail or intermittently drop in staging/production.
- Socket.io events emitted on the same server instance as the connection work, but cross-instance events are never received.

**Phase to address:**
Phase 3 (Real-Time Infrastructure) — Redis adapter and room architecture must be in place before any real-time feature is built on top of it.

---

### Pitfall 7: Photo Upload Failures Leave Orders in Limbo — No Recovery Path

**What goes wrong:**
The washer uploads before/after photos from a mobile device on a potentially poor Gulf cellular connection. The upload fails mid-transfer (R2 intermittent 500s, poor signal, app backgrounded). The order completion flow is gated on photo upload success. The washer has no UI to retry, or retrying creates a duplicate upload. The order gets stuck in "awaiting photos" state indefinitely. This breaks the entire service verification model.

**Why it happens:**
Photo upload is implemented as "upload to R2 → update order" in a single synchronous flow. No retry, no partial upload tracking, no "upload later" fallback. Mobile network reliability is assumed to be as good as desktop development environments.

**How to avoid:**
- Generate signed R2 presigned upload URLs server-side; have the mobile client upload directly to R2 (bypasses the API server for large files).
- Implement client-side exponential backoff retry on upload failures (3 retries minimum before surfacing error to user).
- Store upload state locally on the device — if the app is backgrounded and killed mid-upload, resume on next app open.
- Decouple photo upload from order completion — allow the washer to mark the job complete and upload photos within a grace window (e.g., 15 minutes), notifying the customer that photos are pending.
- Implement multipart upload for R2 for photos over 5MB — R2 handles intermittent 503s better with multipart than single PUT.
- Show the washer a clear "X of Y photos uploaded" progress state so they know what succeeded and what needs retry.
- Track uploaded photo metadata (R2 key, size, timestamp) before associating with the order — allows orphan cleanup and auditing.

**Warning signs:**
- Photo upload goes through the API server as base64 or multipart form data (bypassing presigned URLs).
- No retry logic in the upload component.
- Order completion and photo upload are a single atomic operation with no fallback.
- No local upload queue on the mobile device.

**Phase to address:**
Phase 4 (Service Completion) — The photo evidence system must be designed with offline-first, retry-capable upload architecture before implementation.

---

### Pitfall 8: Prisma + Neon Connection Pool Exhaustion in Serverless Environments

**What goes wrong:**
Each serverless function invocation creates a new Prisma client with its own connection pool. Under load, concurrent function invocations exhaust Neon's connection limit, causing `P1001: Can't reach database` errors for new requests. This does not appear in development (one process) and only surfaces under moderate production traffic.

**Why it happens:**
Prisma instantiation in serverless is commonly done at the module level: `const prisma = new PrismaClient()`. This looks correct but creates a new pool per cold start. Under traffic, dozens of concurrent functions each hold open their pools simultaneously.

**How to avoid:**
- Use Neon's serverless HTTP driver (`@neondatabase/serverless`) with Prisma's `@prisma/adapter-neon` for the Next.js API routes — it uses HTTP connections, not persistent TCP, so no pool exhaustion.
- For the Fastify API server (long-running process), use a single PrismaClient instance as a singleton and configure the connection pool explicitly (`connection_limit=10` in DATABASE_URL).
- Enable Neon's built-in connection pooler (PgBouncer-compatible) and use the pooled connection string for application connections.
- Set `pool_timeout=0` in the connection string to fail fast rather than queue indefinitely.
- Monitor Neon's connection count dashboard during load testing before launch.

**Warning signs:**
- `new PrismaClient()` called inside a request handler rather than as a module singleton.
- DATABASE_URL using the direct connection string (not the pooled `-pooler` endpoint) for serverless functions.
- Database errors only appearing under concurrent load, not in serial testing.

**Phase to address:**
Phase 1 (Foundation) — Database client initialization patterns must be established in the monorepo shared package before any service uses them.

---

### Pitfall 9: BullMQ Stalled Jobs on Worker Crash — Notifications and Payouts Not Sent

**What goes wrong:**
BullMQ workers crash or are restarted (deploy, OOM kill). Any jobs being processed at that moment are marked "stalled" and only requeued after 30 seconds. Notification jobs (SMS, push, WhatsApp) sent twice (on stall + retry). Payout jobs may double-trigger transfers to Stripe. Order status update jobs may be processed out of order on retry, transitioning an order to a past state.

**Why it happens:**
Workers are deployed without graceful shutdown handling. SIGTERM is received, the process exits immediately, and in-progress jobs lose their lock. The 30-second stall window passes, jobs retry, and side effects happen twice.

**How to avoid:**
- Implement graceful shutdown: catch `SIGTERM`, call `worker.close()`, wait for in-progress jobs to complete before process exit.
- Make all BullMQ job handlers idempotent — use `jobId` as an idempotency key when calling Stripe (Stripe natively supports idempotency keys) and when sending notifications (check if already sent via a DB flag).
- Set `maxRetriesPerRequest: null` in the ioredis config passed to BullMQ — required for workers to function correctly.
- Set Redis `maxmemory-policy noeviction` — if Redis evicts BullMQ keys under memory pressure, jobs are silently lost.
- Separate queues by criticality: `payments` queue (1 retry, alert on failure), `notifications` queue (3 retries, fail silently after), `analytics` queue (best-effort).
- Monitor stalled jobs via BullMQ's `stalled` event and alert immediately.

**Warning signs:**
- No `SIGTERM` handler in worker process.
- Stripe API calls in job handlers without idempotency keys.
- Single queue for all job types (payment and notification jobs competing).
- Redis `maxmemory-policy` set to anything other than `noeviction`.

**Phase to address:**
Phase 2 (Async Infrastructure) — Graceful shutdown and idempotency patterns must be established before any business-critical job is processed.

---

### Pitfall 10: Solo Developer Scope Creep Across 5 App Surfaces Kills Launch

**What goes wrong:**
The admin panel gets feature-complete before the customer mobile app is tested with real users. The company dashboard gets polished analytics while the washer app crashes on photo upload. Five partially-done apps ship instead of two great ones. The solo developer spends equal time on all surfaces instead of prioritizing the critical path (customer books → washer completes → company gets paid).

**Why it happens:**
All 5 surfaces are "required" so the developer bounces between them in parallel. Without a strict launch sequence, each app is 60-70% done at the same time, and none is shippable.

**How to avoid:**
- Define the critical path for private beta: customer web/mobile → washer mobile → company dashboard (just enough to manage orders). Admin panel is a monitoring tool, not a user-facing product — build it last.
- Ship the critical path vertically: get the full booking-to-completion flow working end-to-end on these three surfaces before touching admin analytics or loyalty points.
- Designate Phase 1-2 as "zero UI polish, functional only" for non-critical surfaces — admin panel and company analytics get their polish in Phase 3.
- Maintain a strict "not needed for launch" list and enforce it. Loyalty points, promo codes, WhatsApp notifications, analytics dashboards — these are Phase 3 features that must not touch Phase 1-2 velocity.
- Use feature flags to prevent half-built features from blocking the critical path release.

**Warning signs:**
- Admin panel development started before end-to-end booking flow is working.
- Time spent on loyalty points or promo code engine before payment flow is tested.
- Company analytics dashboard more polished than washer job management.
- Test coverage on admin features higher than on order state transitions.

**Phase to address:**
Phase 0 (Scope Definition) — The launch sequence and which surfaces are critical-path must be decided before the first line of code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip RTL in early components, "add later" | Faster initial UI build | Full UI rewrite to replace `left/right` with `start/end` — estimated 2-3x original build time | Never — must be day 1 |
| Single Socket.io server without Redis adapter | No Redis setup needed | Cannot horizontally scale; all connections must hit one server; breaks on any multi-instance deploy | Never in production |
| Transfer payout immediately on payment | Simpler payment flow | Platform absorbs full refund/dispute losses after payout; no reclamation path | Never — payout delay is mandatory |
| Use Expo managed workflow for GPS tracking | Faster iteration | Background tracking unreliable on production devices; GPS lost mid-job | Acceptable in development only |
| Hard-code AED currency | One less config variable | Blocks KSA/Egypt expansion; requires code changes for multi-currency | Acceptable for Phase 1-2 MVP |
| Skip BullMQ worker graceful shutdown | Simpler worker code | Duplicate notifications, double Stripe transfers on deploy | Never — implement from first worker |
| Admin panel built in parallel with core flow | Feels more "complete" | Critical path apps (customer/washer) are under-tested at launch | Never — sequence surfaces by criticality |
| Global Prisma client without singleton check | Standard `new PrismaClient()` pattern | Connection pool exhaustion under load in serverless | Never in serverless/Next.js contexts |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Connect UAE | Assume self-serve Express onboarding works | Contact Stripe before building; design for manual onboarding step; use `destination_charges` not `on_behalf_of` |
| Stripe Connect payouts | Transfer immediately after payment capture | Delay transfer 7-14 days post-completion; implement `transfer_reversal` in refund flow |
| Stripe webhooks | Handle only `payment_intent.succeeded` | Handle `charge.dispute.created`, `account.updated`, `payout.failed`, `transfer.reversed` — all critical for marketplace |
| Expo Location background | Test in Expo Go | Test only in production builds on real devices with battery saver enabled |
| Socket.io scaling | Deploy to Vercel Serverless | Deploy to persistent process host (Railway/Render); add Redis adapter before first deployment |
| Neon/Prisma serverless | `new PrismaClient()` in handler | Singleton PrismaClient for long-running processes; Neon HTTP adapter for serverless functions |
| BullMQ/Redis | Default `maxmemory-policy` | Set `maxmemory-policy noeviction` on Redis; set `maxRetriesPerRequest: null` in ioredis config |
| Cloudflare R2 uploads | Proxy uploads through API server | Presigned URLs for direct client-to-R2 upload; multipart for files over 5MB |
| i18next Arabic | Use `ar` locale code only | Use `ar-AE` for UAE (affects date formats, number formatting); test on Arabic-locale device, not simulator |
| next-intl / App Router | Use Pages Router built-in i18n | App Router removed built-in i18n; use `next-intl` or `next-i18n-router` for route-based locale detection |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| GPS location updates every 1-2 seconds per washer | Database overwhelmed with location writes; high mobile battery drain | 10-second interval minimum; write to Redis first, persist to DB every 30s; only persist if distance delta > 50m | 10+ active washers simultaneously |
| Loading all company listings without geographic filtering | Slow initial load; irrelevant results for customer | Filter by GPS-detected city before returning company list; paginate results | 50+ companies on platform |
| Eager-loading all order history in company dashboard | Dashboard load time > 3s | Paginate order history; lazy-load stats separately | 1000+ orders per company |
| Socket.io events without rooms — broadcast to all | Network and CPU overhead scales with total connections | Always use `orderId` rooms; never broadcast to entire socket namespace | 100+ concurrent orders |
| Prisma N+1 queries in order detail view | Slow order page; many DB roundtrips | Use Prisma `include` with explicit relation selection; never fetch relations in a loop | 50+ concurrent order loads |
| R2 presigned URL generated on every page render | Unnecessary Stripe/R2 API calls; slow photo display | Cache presigned URLs with TTL matching URL expiry (1 hour); or use R2 public bucket with signed tokens | High-traffic order history views |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Stripe secret key in frontend or mobile app | Full account takeover, fraudulent charges | Stripe secret key lives only in backend; use publishable key in frontend; enforce env var validation at startup |
| Allowing customers to submit their own final order amount | Revenue fraud — customer submits AED 1 for a AED 200 service | Prices always computed server-side from package IDs; never accept amount from client |
| Not verifying Stripe webhook signatures | Fake webhook injection — malicious payout triggers | Verify every webhook with `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` before processing |
| Trusting `washer_id` from mobile app request | Order hijacking — washer claims another washer's job | Derive washer identity from authenticated JWT, never from request body |
| Signed R2 URLs with no expiry | Anyone with a URL can access private photos indefinitely | Set R2 presigned URL TTL to 1 hour; regenerate on each legitimate access |
| No rate limiting on OTP SMS endpoint | AED cost attack — thousands of OTP SMSs sent to arbitrary numbers | Rate limit OTP to 3 per phone number per 15 minutes; use CAPTCHA on web |
| Company dashboard showing other companies' orders | Data isolation failure — company A sees company B's business | Always scope all queries with `WHERE company_id = $authenticated_company_id` |
| Unrestricted file type upload for photos | Malware upload via photo endpoint | Validate MIME type server-side (not just extension); accept only `image/jpeg` and `image/png` for the photo evidence system |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| GPS tracking UI shows spinner when washer GPS is lost | Customer assumes nothing is happening; contacts support | Show "Last seen X minutes ago at [location]" with a visual indicator that tracking is temporarily unavailable |
| Order cancellation with no explanation of policy | Customer confusion; support tickets | Show cancellation window clearly ("Free cancellation within 30 minutes of booking"); show fee if cancelling after washer is en route |
| Arabic text in English layout (English font, LTR spacing) | Text visually broken; Arabic feels like an afterthought | Use Arabic-specific font (Cairo, Tajawal); verify Arabic text rendering on real iOS/Android before shipping |
| Company onboarding 10-step form before they can do anything | High abandonment; companies give up before seeing value | Progressive onboarding — company can browse after step 1; unlock each feature as they complete more steps |
| No "washer is on the way" push notification | Customers don't know service is starting; miss the washer | Send push notification when washer status changes to "en route"; include ETA |
| Photo evidence checklist shown after job is complete | Washer forgets required photos | Show checklist in-context during the job, not as a post-completion form |
| English-only error messages in Arabic UI | Breaks trust with Arabic-first users | All error messages must have Arabic translations; default to Arabic for UAE-locale devices |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stripe Connect payouts:** Onboarding works in test mode — verify with actual UAE company account, not a default test account with US details.
- [ ] **RTL layout:** Looks correct in English — switch device to Arabic locale and verify every screen. Component using `marginLeft` will break visually in RTL.
- [ ] **Background GPS:** Tracks correctly in Expo Go — build a production APK/IPA and test with the screen off, battery saver on, app force-closed and reopened.
- [ ] **Order state transitions:** Single-user flow works — test concurrent requests (two washers accepting the same order simultaneously) against a test database.
- [ ] **Photo upload:** Works on fast WiFi — test on a throttled 3G connection with app backgrounded mid-upload, then re-opened.
- [ ] **Push notifications:** Arrive in development — verify on a physical device that has revoked then re-granted notification permissions.
- [ ] **Socket.io tracking:** Works on single server — deploy two instances behind a load balancer and verify updates still reach the customer.
- [ ] **BullMQ jobs:** Process correctly in normal flow — kill the worker mid-job and verify the job is retried exactly once, not duplicated.
- [ ] **Arabic number formatting:** Displays in Western numerals — verify AED prices don't render in Eastern Arabic numerals (٢٠٠) on Arabic-locale devices unless intended.
- [ ] **Company payout after refund:** Refund flow tested in isolation — test: payment made, transfer executed, then customer refund issued. Verify platform account is not over-debited.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RTL retrofit (built LTR first) | HIGH | Audit every component for `left`/`right` properties; replace with `start`/`end`; retest all screens in Arabic locale; expect 2-4 weeks |
| Stripe Connect UAE onboarding broken | MEDIUM | Contact Stripe support; rebuild onboarding UI to accommodate manual activation; implement pending state for companies |
| Socket.io no Redis adapter (production multi-instance) | MEDIUM | Add `@socket.io/redis-adapter`; redeploy; existing sessions reconnect automatically; no data loss |
| Stripe double-transfer on dispute | HIGH | Manual Stripe dashboard reconciliation; implement `transfer_reversal` webhook handler; audit all historical transfers; may require Stripe support |
| GPS background tracking lost | MEDIUM | Add foreground service notification; switch to `react-native-background-geolocation`; rebuild GPS module; resubmit to app stores |
| Order race condition in production | HIGH | Hotfix: add `FOR UPDATE` to order transition query; audit and resolve stuck orders manually; retroactive version column migration |
| BullMQ duplicate jobs in production | MEDIUM | Add idempotency keys to all Stripe calls; add "already notified" DB check to notification jobs; manually investigate and reverse duplicate transfers |
| Prisma connection exhaustion | LOW | Enable Neon pooler; update connection string; redeploy — no data loss, pure configuration fix |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stripe Connect UAE restrictions | Phase 1: Foundation | Stripe account created; UAE Connect capability confirmed with Stripe support; test company onboarding complete |
| Refund/dispute clawback | Phase 2: Payments | Dispute webhook handler implemented; payout delay configured; refund flow tested with transfer_reversal |
| RTL/Arabic from day 1 | Phase 1: Foundation | All shared UI components use `start`/`end`; Arabic locale device test passes on first component |
| GPS background tracking | Phase 3: Real-Time | Production build tested on Samsung Galaxy and iPhone with battery saver; GPS survives app background for 10+ minutes |
| Order state machine race conditions | Phase 2: Order Management | Concurrent acceptance test passes; version column in schema; FOR UPDATE in transition queries |
| Socket.io single-instance trap | Phase 3: Real-Time | Redis adapter installed and tested; two-instance load balancer test passes before building any real-time feature |
| Photo upload reliability | Phase 4: Service Completion | Upload retry tested on 3G-throttled connection; app-killed-mid-upload recovery tested; presigned URL flow verified |
| Prisma/Neon connection exhaustion | Phase 1: Foundation | PrismaClient singleton established in shared package; pooled connection string used; connection count verified under load |
| BullMQ stalled jobs | Phase 2: Async Infrastructure | SIGTERM handler implemented; idempotency keys on all Stripe calls; Redis maxmemory-policy confirmed `noeviction` |
| Solo developer scope creep | Phase 0: Planning | Launch surface sequence defined; non-critical features explicitly flagged as Phase 3; critical path end-to-end tested before any polish work |

---

## Sources

- [Stripe Connect availability in the UAE](https://support.stripe.com/questions/connect-availability-in-the-uae)
- [Stripe Connect for Payouts — lessons from multi-vendor flow](https://fordewind.io/stripe-connect-for-payouts-what-we-learned-integrating-a-multi-vendor-flow/)
- [Scaling Socket.IO — real-world challenges](https://ably.com/topic/scaling-socketio)
- [Socket.IO scaling for high-performance systems](https://medium.com/devmap/how-to-scale-socket-io-for-high-performance-real-time-systems-7da745f69202)
- [React Native background GPS tracking without timeout](https://itnext.io/react-native-background-location-tracking-without-timeout-and-with-app-killed-3dbfbc80ad01)
- [Expo background task limitations guide](https://flexapp.ai/blog/expo-background-tasks-guide)
- [Track user location without killing battery — React Native](https://medium.com/@mohantaankit2002/track-user-location-without-killing-their-battery-a-react-native-guide-d57f29fd2ebe)
- [RTL support for React Native apps](https://reactnative.dev/blog/2016/08/19/right-to-left-support-for-react-native-apps)
- [forceRTL iOS/Android device language issue](https://github.com/facebook/react-native/issues/39414)
- [Solving race conditions in booking systems](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Double-booking disaster in distributed systems](https://medium.com/@shivanshgaur28/the-double-booking-disaster-defeating-race-conditions-in-distributed-systems-9dca7b7344ba)
- [Cloudflare R2 intermittent 500 errors](https://community.cloudflare.com/t/r2-intermittent-500-errors-on-put/485134)
- [BullMQ stalled jobs documentation](https://docs.bullmq.io/guide/workers/stalled-jobs)
- [BullMQ at scale — millions of jobs](https://medium.com/@kaushalsinh73/bullmq-at-scale-queueing-millions-of-jobs-without-breaking-ba4c24ddf104)
- [Prisma connection pooling in serverless environments](https://dev.to/prisma/using-prisma-to-address-connection-pooling-issues-in-serverless-environments-3g66)
- [Connect from Prisma to Neon](https://neon.com/docs/guides/prisma)
- [WebSocket reconnection strategies](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection-logic/view)
- [Secure marketplace payments — multi-party fraud](https://www.rapyd.net/blog/secure-payments-marketplace/)

---
*Pitfalls research for: On-demand cleaning services marketplace (Gulf region, AR/EN, 5 surfaces)*
*Researched: 2026-03-30*
