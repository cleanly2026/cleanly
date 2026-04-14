---
phase: 10-ci-cd-monitoring
plan: 03
subsystem: payments
tags: [stripe, webhooks, idempotency, prisma, postgres, vitest, fastify]

requires:
  - phase: 05-payments-orders (v1.0)
    provides: Stripe webhook handler with signature verification (MON-04)
  - phase: 02-database (v1.0)
    provides: Prisma schema + migration tooling

provides:
  - ProcessedStripeEvent Prisma model with event_id PK and processed_at index
  - Manual migration folder 20260414154646_add_processed_stripe_events ready for prisma migrate deploy
  - Insert-before-process idempotency wrapping the existing webhook switch (createMany skipDuplicates)
  - Three Vitest tests locking duplicate-event short-circuit behavior
affects: [10-04-monitoring-retention, 11-staging-validation, production-stripe-webhooks]

tech-stack:
  added: []
  patterns:
    - insert-before-process idempotency (createMany skipDuplicates) for exactly-once webhook side effects
    - dedicated Prisma table (not Redis) for durable, auditable event dedup
    - Vitest module mocking of Prisma singleton + Stripe service for isolated handler tests

key-files:
  created:
    - packages/db/migrations/20260414154646_add_processed_stripe_events/migration.sql
    - apps/api/src/__tests__/webhook-idempotency.test.ts
  modified:
    - packages/db/schema.prisma
    - apps/api/src/routes/payments/webhook.ts

key-decisions:
  - "Durable Postgres table (not Redis) for event dedup — survives Redis outages, auditable"
  - "createMany skipDuplicates (not .create + try/catch P2002) — concurrency-safe and lint-friendly"
  - "Insert-before-process ordering — marker written before side effect, so retried duplicates never re-execute"
  - "Migration folder constructed manually because project uses db push + numbered manual SQL (no prior prisma-managed migrations) — drift prevented prisma migrate dev --create-only from succeeding"

patterns-established:
  - "Webhook idempotency: event_id PK + createMany skipDuplicates → count==0 means duplicate, return 200 {received:true, duplicate:true}"
  - "Test infra: mock ../lib/prisma.js + ../services/stripe.service.js + ../lib/env.js, register fastify-raw-body with field:rawBody before the route, inject with content-type: application/json"

requirements-completed: [MON-05]

duration: 6min
completed: 2026-04-14
---

# Phase 10 Plan 03: Stripe Webhook Idempotency Summary

**Insert-before-process webhook dedup using a Postgres ProcessedStripeEvent table and createMany skipDuplicates, preventing Stripe retries from double-charging orders while keeping the existing switch block and MON-04 signature verification untouched.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-14T15:44:21Z
- **Completed:** 2026-04-14T15:49:59Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- New `ProcessedStripeEvent` Prisma model mapped to `processed_stripe_events` with `event_id` primary key, `event_type`, nullable `order_id`, and `processed_at` (indexed for the 30-day cleanup job in Plan 10-04).
- Migration folder `20260414154646_add_processed_stripe_events/migration.sql` with `CREATE TABLE` + `CREATE INDEX`, ready for Plan 10-02's `prisma migrate deploy` CI step to apply against staging and production Neon.
- Webhook handler now performs an insert-before-process check: `prisma.processedStripeEvent.createMany({ skipDuplicates: true })`. When `count === 0`, the handler logs and returns `200 {received: true, duplicate: true}` without touching `prisma.order.update` or any other side effect.
- Three Vitest tests (`apps/api/src/__tests__/webhook-idempotency.test.ts`) prove: (1) first-time events insert a marker and run the switch, (2) duplicates short-circuit with `duplicate: true` and skip `order.update`, (3) two identical requests result in exactly one side-effect call.
- Signature verification path (MON-04) and all four original switch cases (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`, `account.updated`) remain byte-identical.

## Task Commits

Each task was committed atomically with `--no-verify` per parallel-executor protocol:

1. **Task 1: Add ProcessedStripeEvent model and migration** — `7b859c9` (feat)
2. **Task 2 RED: Failing webhook idempotency tests** — `a544c87` (test)
3. **Task 2 GREEN: Wrap switch in idempotency INSERT** — `5fbda61` (feat)

## Files Created/Modified

- `packages/db/schema.prisma` — appended `model ProcessedStripeEvent { ... @@index([processed_at]) @@map("processed_stripe_events") }` after `AuditLog`.
- `packages/db/migrations/20260414154646_add_processed_stripe_events/migration.sql` — new migration:

  ```sql
  -- CreateTable
  CREATE TABLE "processed_stripe_events" (
      "event_id" TEXT NOT NULL,
      "event_type" TEXT NOT NULL,
      "order_id" TEXT,
      "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "processed_stripe_events_pkey" PRIMARY KEY ("event_id")
  );

  -- CreateIndex
  CREATE INDEX "processed_stripe_events_processed_at_idx" ON "processed_stripe_events"("processed_at");
  ```

- `apps/api/src/routes/payments/webhook.ts` — inserted the following block between the signature-verification `try/catch` and the `switch (event.type)`:

  ```ts
  // Idempotency check (MON-05): attempt to record this event. If createMany
  // reports count=0, another process (or a Stripe retry) already handled it.
  const orderIdForMarker =
    'object' in event.data && (event.data.object as any)?.metadata?.order_id
      ? String((event.data.object as any).metadata.order_id)
      : null

  const inserted = await prisma.processedStripeEvent.createMany({
    data: [{ event_id: event.id, event_type: event.type, order_id: orderIdForMarker }],
    skipDuplicates: true,
  })

  if (inserted.count === 0) {
    fastify.log.info(`[stripe-webhook] Duplicate event ${event.id} (${event.type}) — skipping; already processed`)
    return reply.status(200).send({ received: true, duplicate: true })
  }
  ```

- `apps/api/src/__tests__/webhook-idempotency.test.ts` — new Vitest suite (3 tests, all green).

## Test Output (3/3 green)

```
 RUN  v2.1.9 C:/Users/Rashino/Documents/ROFAN/apps/api

 ✓ src/__tests__/webhook-idempotency.test.ts (3 tests) 339ms
   ✓ Stripe webhook idempotency (MON-05) > processes a first-time event and inserts a marker row
   ✓ Stripe webhook idempotency (MON-05) > short-circuits a duplicate event (createMany returns count=0)
   ✓ Stripe webhook idempotency (MON-05) > two identical requests only process the side-effect once

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

`pnpm --filter @cleanly/api typecheck` also exits 0.

## Decisions Made

- **Manual migration folder construction (deviation from plan Action step 2).** The plan assumed `pnpm prisma migrate dev --name ... --create-only` would produce the folder. In practice, the Neon `neondb` database has 14 tables created via `db push` (not prisma-managed migrations), and the `packages/db/migrations/` folder contains only a manual `0002_postgis_indexes.sql` + `migration_lock.toml`. Prisma detects schema drift and refuses to create the migration without a `migrate reset` that would drop all data. Resolution: used `prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script` to confirm Prisma's canonical SQL output for the new table, then wrote the migration folder (`20260414154646_add_processed_stripe_events/migration.sql`) by hand with the exact SQL shape the plan specified. `prisma validate` passes and `prisma generate` successfully produced the client with `prisma.processedStripeEvent.createMany` typed. This is Rule 3 (Auto-fix blocking issue).
- **Added `content-type: application/json` to test `inject()` calls.** `fastify-raw-body` returned 415 Unsupported Media Type during the initial RED run because the mock requests had no content-type. Added the header so tests exercise the real code path; this also mirrors what Stripe sends in production.
- **Added `vi.mock('../lib/env.js', ...)`.** The webhook handler imports `env.STRIPE_WEBHOOK_SECRET`, and loading the real env module in the test environment would require all Cleanly env vars. Mocking it returns predictable test stubs and isolates the handler under test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `prisma migrate dev --create-only` fails on drifted database**

- **Found during:** Task 1 (Add ProcessedStripeEvent model and migration)
- **Issue:** `pnpm --filter @cleanly/db exec prisma migrate dev --name add_processed_stripe_events --create-only` exited with "Drift detected" and "We need to reset the public schema". The project uses `db push` + manual numbered SQL files, so Prisma's migration engine could not produce a `--create-only` migration without requiring a destructive reset.
- **Fix:** Generated canonical Prisma SQL via `prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script`, copied the `CREATE TABLE "processed_stripe_events"` block verbatim (matches plan's expected SQL), and wrote `packages/db/migrations/20260414154646_add_processed_stripe_events/migration.sql` directly. Added the plan-specified `CREATE INDEX "processed_stripe_events_processed_at_idx"` per Prisma's default naming convention.
- **Files modified:** `packages/db/migrations/20260414154646_add_processed_stripe_events/migration.sql` (created).
- **Verification:** `prisma validate` passes. Migration SQL matches the plan's expected shape exactly (`PRIMARY KEY ("event_id")`, `CREATE INDEX` on `processed_at`). `prisma.processedStripeEvent.createMany` compile-checks in webhook.ts (task 2 typecheck passed).
- **Committed in:** 7b859c9

**2. [Rule 3 - Blocking] Vitest test requests returned 415 without `content-type` header**

- **Found during:** Task 2 RED phase
- **Issue:** `fastify-raw-body` rejected POSTs with 415 when no `content-type` was present, so the tests never reached the signature-verification or idempotency code. The plan's test fixture only sent `stripe-signature`.
- **Fix:** Added `'content-type': 'application/json'` to all three test `inject()` calls. Matches what Stripe actually sends in production.
- **Files modified:** `apps/api/src/__tests__/webhook-idempotency.test.ts`
- **Verification:** All 3 tests pass GREEN.
- **Committed in:** a544c87

**3. [Rule 3 - Blocking] `env.js` loader threw in test env**

- **Found during:** Task 2 RED phase (same iteration as #2)
- **Issue:** Importing the webhook route in Vitest pulled `../lib/env.js` which validates all Cleanly env vars at module load; the CI test env doesn't set them. Would prevent the handler from loading at all.
- **Fix:** Added `vi.mock('../lib/env.js', () => ({ env: { STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_SECRET_KEY: 'sk_test' } }))` alongside the existing Prisma + Stripe mocks.
- **Files modified:** `apps/api/src/__tests__/webhook-idempotency.test.ts`
- **Verification:** Tests load and exercise the full handler path.
- **Committed in:** a544c87

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking). **Impact on plan:** No scope creep. All deviations enabled the plan's explicit acceptance criteria; the SQL shape, handler diff, and three-test suite described in `<action>` are in place exactly as specified.

## Issues Encountered

- None beyond the deviations documented above. Signature verification, raw-body handler, and switch-block case order were preserved byte-for-byte per D-07.

## Retention Note

The `processed_stripe_events` table has no automatic pruning in this plan. The 30-day retention job is Plan 10-04's responsibility (`apps/api/src/workers/cleanup.worker.ts` per the model's docstring). Leaving the table unbounded short-term is safe: Stripe only retries for 72 hours, so any row older than that is already past its dedup window — the table becomes a small audit log until Plan 10-04 ships.

## Next Phase Readiness

- **Plan 10-02 (CI)** needs to include `pnpm --filter @cleanly/db exec prisma migrate deploy` in the deploy step so the new migration applies to staging and production Neon on next deploy.
- **Plan 10-04 (retention)** picks up the daily cleanup worker that deletes `processed_stripe_events` older than 30 days, using the `processed_at` index created here.
- Production webhook endpoint (MON-04 locked, MON-05 now in place) is now safe against Stripe retry storms — no more double-paying orders, no more double-flagging disputes.

## Self-Check: PASSED

All 4 created/modified files exist on disk. All 3 per-task commits present in `git log` (7b859c9 model/migration, a544c87 RED test, 5fbda61 GREEN handler).

---
*Phase: 10-ci-cd-monitoring*
*Completed: 2026-04-14*
