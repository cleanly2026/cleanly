---
status: partial
phase: 02-core-business-flow
source: [02-VERIFICATION.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end customer booking flow
expected: Customer can browse companies, select package, complete Stripe payment in test mode, and see order created
result: [pending]

### 2. RTL layout in Arabic mode
expected: All customer-web and company-web pages render correctly in Arabic RTL mode — text aligned right, layout mirrored, no broken spacing
result: [pending]

### 3. Socket.io real-time order notifications
expected: When a new order is created, the company dashboard order feed updates in real-time without page refresh (requires two concurrent browser sessions)
result: [pending]

### 4. Auth context scope decision
expected: Product owner confirms that `companyId = 'TODO_FROM_AUTH'` placeholder in company-web router is acceptable for Phase 2 sign-off (auth context wiring deferred to Phase 3)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
