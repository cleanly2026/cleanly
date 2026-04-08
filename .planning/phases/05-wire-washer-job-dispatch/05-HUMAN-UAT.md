---
status: partial
phase: 05-wire-washer-job-dispatch
source: [05-VERIFICATION.md]
started: 2026-04-08T15:30:00Z
updated: 2026-04-08T15:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end dispatch flow
expected: Company assigns washer → washer receives takeover screen with job details → accept/decline buttons work → order state updates in company dashboard
result: [pending]

### 2. 30s auto-decline behavior
expected: Countdown expires → declineJob emitted → washer set offline → navigate home
result: [pending]

### 3. JWT washer room auto-join
expected: Washer receives job:alert without needing washer:join-order event — personal room joined automatically on socket connection via JWT
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
