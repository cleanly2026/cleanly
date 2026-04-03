---
phase: 02-core-business-flow
plan: 11
subsystem: payments
tags: [bullmq, stripe, stripe-connect, workers, queue, refund, payout]

# Dependency graph
requires:
  - phase: 02-core-business-flow
    provides: order lifecycle routes (lifecycle.ts) that enqueue jobs on the 'orders' queue, stripe.service.ts with createRefund
provides:
  - BullMQ Worker('orders') consuming schedule-payout, washer-response-timeout, process-refund jobs
  - PAY-04: Stripe Connect transfer with idempotency key on order completion (7-day delayed payout)
  - PAY-06: Refund flow via createRefund (reverse_transfer: true, refund_application_fee: true)
  - ORD-04: Washer 30-second auto-decline timer consumer with state guard
affects: [phase-03, washer-mobile, payments, order-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns: [BullMQ Worker pattern with graceful SIGTERM/SIGINT shutdown, Stripe idempotency key for retry-safe transfers]

key-files:
  created:
    - apps/api/src/workers/order.worker.ts
  modified: []

key-decisions:
  - "Worker queue name must be 'orders' (not 'order-lifecycle') — matches Queue created in lib/queue.ts"
  - "Idempotency key format payout-${order_id} prevents double Stripe transfers on BullMQ retry (3 attempts with exponential backoff)"
  - "Washer timeout handler checks both status=washer_assigned AND washer_id=same washer to handle stale timeout jobs after state has already changed"

patterns-established:
  - "BullMQ order worker: Worker('orders', handler, { connection: redis, concurrency: 5 })"
  - "Graceful shutdown: await worker.close() then await redis.quit() then process.exit(0)"

requirements-completed: [PAY-04, PAY-06, ORD-04]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 02 Plan 11: Order Worker Summary

**BullMQ Worker('orders') consuming payout, washer-timeout, and refund jobs with Stripe idempotency and state guards**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T00:30:00Z
- **Completed:** 2026-04-03T00:35:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created order worker consuming the 'orders' BullMQ queue (matching lib/queue.ts Queue name)
- PAY-04: `schedule-payout` handler creates Stripe Connect transfer with idempotency key `payout-${order_id}`, skips if payment_status != 'paid'
- PAY-06: `process-refund` handler calls createRefund (which uses reverse_transfer: true and refund_application_fee: true), then updates order payment_status to 'refunded'
- ORD-04: `washer-response-timeout` handler auto-declines if order is still in washer_assigned state with the same washer, reverts to status='accepted' with washer_id=null
- Graceful shutdown via SIGTERM/SIGINT following notification.worker.ts pattern

## Task Commits

1. **Task 1: BullMQ order worker — payout, washer timeout, refund handlers** - `859e34a` (feat)

## Files Created/Modified
- `apps/api/src/workers/order.worker.ts` - BullMQ Worker('orders') with three job type handlers and graceful shutdown

## Decisions Made
- Queue name 'orders' matches the Queue in lib/queue.ts exactly (previously lifecycle.ts was using orderQueue which uses this name)
- Idempotency key `payout-${order_id}` ensures no double transfers even if the job retries up to 3 times
- Washer timeout state guard prevents stale timeout from auto-declining a washer who already accepted or was reassigned

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors exist in other files (prisma.ts, routes, server.ts) — these are out of scope for this plan. The new order.worker.ts file compiles without errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three gap closure jobs (PAY-04, PAY-06, ORD-04) now have consumers
- Company payouts will be processed automatically 7 days after order completion
- Washer 30-second response timeout is now enforced
- Refund flow is complete end-to-end
- Worker must be started as a separate process alongside the Fastify API server (see Railway/Fly.io worker dyno setup)

---
*Phase: 02-core-business-flow*
*Completed: 2026-04-03*
