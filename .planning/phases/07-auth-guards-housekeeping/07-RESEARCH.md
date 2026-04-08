# Phase 07: Auth Guards & Housekeeping - Research

**Researched:** 2026-04-09
**Domain:** Authentication guards (React SPA), Fastify env safety, planning artifact reconciliation, dead queue cleanup
**Confidence:** HIGH

## Summary

Phase 07 is a cleanup and debt-closure phase with four well-defined mechanical tasks identified by the v1.0 milestone audit. No new features. No UI changes. The deliverables are: (1) verify company-web route protection via `AuthGate`, (2) make `ADMIN_EXCHANGE_SECRET` missing non-fatal, (3) reconcile 22 stale checkboxes plus the misleading PAY-02 checkbox in REQUIREMENTS.md, and (4) remove the dead `order-lifecycle` queue from `queues/queues.ts`.

All source files and VERIFICATION.md from Phase 6 confirm the current state clearly. The AuthGate implemented in Phase 6 (`main.tsx` lines 13-42) already gates all company-web routes — verification confirms this satisfies AUTH-03 and AUTH-04's company route protection. The env assertion issue is a real crash risk (`const EXCHANGE_SECRET = process.env.ADMIN_EXCHANGE_SECRET!` at module import time). The checkbox audit is deterministic: 22 Phase 2 reqs need `[ ]` → `[x]`, and PAY-02 needs its checkbox changed from `[x]` to `[ ]` with a strikethrough N/A note (already present in the latest REQUIREMENTS.md but may need verification against the audit list).

**Primary recommendation:** Execute four independent tasks in one wave — no inter-task dependencies. AuthGate verification requires a smoke test; env fix requires a graceful 503 fallback pattern matching `stripe.service.ts`; checkbox update is a text edit against the audit's enumerated list; queue cleanup is a one-line deletion.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 6 already added `AuthGate` in `apps/company-web/src/main.tsx` (lines 13-42). Unauthenticated users see login instead of routes. Verify this satisfies success criterion 1 and add a smoke test if needed. No additional per-route guards required unless AuthGate is bypassed.
- **D-02:** `apps/api/src/routes/auth/admin.ts` line 10 uses `process.env.ADMIN_EXCHANGE_SECRET!` — non-null assertion causes crash on import if env var is missing. Fix: replace with a graceful fallback that logs a warning and disables the admin exchange route (returns 503) instead of crashing the entire Fastify server.
- **D-03:** Read all `*-VERIFICATION.md` files across phases 1-6. For each requirement ID referenced, check whether it passed verification. Update REQUIREMENTS.md checkboxes to `[x]` for verified requirements and ensure none are falsely checked. The milestone audit identified 22 stale checkboxes and 1 misleading PAY-02 checkbox — fix all of them.
- **D-04:** The milestone audit identified dead/unused queue references. Remove any queue imports or registrations that reference queues not actually used in the current codebase. Lightweight grep + cleanup.

### Claude's Discretion

- Test approach for route guard verification (unit test vs integration test vs manual check)
- Exact error message format for missing ADMIN_EXCHANGE_SECRET
- Whether to add env validation at server startup vs lazy check in route handler

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-03 | Company admin can log in with email and bcrypt password | Phase 6 `AuthGate` + `auth-context.tsx` implement the login flow. Verification confirms gate is active. The route guard satisfies the "protected behind auth" condition for this requirement. |
| AUTH-04 | Company admin account requires TOTP MFA for payout access | `AuthGate` in `main.tsx` gates the entire SPA including payout-adjacent routes. `MfaPage` wired in Phase 6. AuthGate verification closes the "routes unprotected" gap flagged in the audit. |
</phase_requirements>

## Standard Stack

### Core (already installed — no new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | Detected in `apps/api/vitest.config.ts` | Test runner for smoke test | Already in use across Phase 6 integration tests |
| `buildTestApp` helper | `apps/api/src/test-helpers/build-app.ts` | Fastify test builder with mocked auth | Established Phase 6 pattern — passthrough validator, `x-test-user` header auth |
| `crypto` (Node built-in) | Node 20 LTS | HMAC in admin.ts | Already imported in admin.ts |

**Installation:** None required. Phase 07 adds no new dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest integration test for AuthGate | Manual browser check | Vitest is already wired; a programmatic smoke test is faster and reproducible |
| Lazy env check in route handler | Startup-time env validation | Startup validation is more fail-fast but harder to gracefully 503; lazy check matches stripe.service.ts pattern already established |

## Architecture Patterns

### Established Patterns (reuse these — do not invent new ones)

#### Pattern 1: Graceful Env Guard (stripe.service.ts model)

**What:** Lazy singleton with explicit error throw only when the feature is actually used — not at module import time.

**When to use:** Any env var that is optional for development or CI but required for production. Admin exchange secret is not needed for normal API operation.

**Example (from `apps/api/src/services/stripe.service.ts`):**
```typescript
// Source: apps/api/src/services/stripe.service.ts (verified in codebase)
let _stripe: Stripe | undefined

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set — add it to apps/api/.env')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { ... })
  }
  return _stripe
}
```

**Adaptation for admin.ts (D-02 target):** Instead of throwing, return 503 and log a warning. The admin exchange route should be a no-op when the secret is absent, not a server-crashing module-level assertion.

```typescript
// Target pattern for apps/api/src/routes/auth/admin.ts
export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/exchange', {
    handler: async (request, reply) => {
      const secret = process.env.ADMIN_EXCHANGE_SECRET
      if (!secret) {
        fastify.log.warn('[admin] ADMIN_EXCHANGE_SECRET not set — exchange route disabled')
        return reply.status(503).send({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Admin exchange not configured',
        })
      }
      // ... existing HMAC verification using secret
    },
  })
}
```

**Key detail:** The `verifyExchangeSignature` function currently uses the module-level `EXCHANGE_SECRET` constant. Moving the secret resolution inside the handler requires passing `secret` as a parameter or inlining the HMAC logic. The `crypto.timingSafeEqual` call also requires both buffers to be the same length — preserve this invariant.

#### Pattern 2: AuthGate (React SPA — already implemented)

**What:** Top-level React component wrapping `AppRoutes` that checks `isAuthenticated` before rendering any route.

**Source:** `apps/company-web/src/main.tsx` lines 13-42 (confirmed in Phase 6 VERIFICATION.md).

**Key fact:** This already exists and is verified. Phase 7 task is verification and smoke test — not implementation.

```tsx
// Source: apps/company-web/src/main.tsx (verified)
function AuthGate() {
  const { isAuthenticated, login } = useAuth()
  // ... mfaState handling
  if (isAuthenticated) return <AppRoutes />
  if (mfaState) return <MfaPage ... />
  return <LoginPage ... />
}
```

**Smoke test approach (Claude's discretion):** A lightweight Vitest unit test or integration test confirming `AuthGate` renders `<LoginPage>` when `isAuthenticated` is false, and `<AppRoutes>` when true. Does not require a running server — mock `useAuth`.

#### Pattern 3: buildTestApp (existing Phase 6 integration test pattern)

**What:** Reusable Fastify test builder that accepts route plugins and prefixes, mocks auth via `x-test-user` header.

**Source:** `apps/api/src/test-helpers/build-app.ts` (verified in Phase 6 VERIFICATION.md).

**Use for admin.ts test:** Can instantiate an `adminRoutes` plugin under `/api/auth/admin` and send POST `/api/auth/admin/exchange` with missing env var to assert 503 response.

### Checkbox Reconciliation — Exact List

From the milestone audit (HIGH confidence — sourced directly from `.planning/v1.0-MILESTONE-AUDIT.md`):

**22 checkboxes to update from `[ ]` to `[x]` (Phase 2 requirements, verified in 02-VERIFICATION.md):**
- DISC-01, DISC-02, DISC-03, DISC-05
- BOOK-01, BOOK-02, BOOK-03, BOOK-04
- CARP-01, CARP-02, CARP-04, CARP-05
- PAY-01, PAY-03, PAY-05
- ORD-01, ORD-02, ORD-03, ORD-05, ORD-06
- COMP-01, COMP-02, COMP-07

**1 checkbox to correct (PAY-02):**
The current REQUIREMENTS.md (verified by reading the file) already has: `- [ ] **PAY-02**: ~~Customer can pay using wallet balance (topped up via Stripe)~~ — N/A, scoped out of v1.0`. This is correct — the checkbox is `[ ]` and the text is struck through with an N/A note. The audit flagged it as "misleading `[x]`" but the current file already reflects the corrected state. The plan should verify this is already correct rather than blindly re-applying the fix.

### Dead Queue — Exact Finding

**Source:** `apps/api/src/queues/queues.ts` (read directly).

```typescript
// This queue has no matching worker — it is dead
export const orderQueue = new Queue('order-lifecycle', { ... })
```

**Canonical queue** is in `apps/api/src/lib/queue.ts`:
```typescript
export const orderQueue = new Queue('orders', { ... })
```

The `queues/queues.ts` file also exports `notificationQueue` (named `'notifications'`). This queue is active — do not remove it. Only the `orderQueue` export from `queues/queues.ts` (named `'order-lifecycle'`) is dead.

**Action:** Remove `orderQueue` export from `queues/queues.ts` and any imports of `orderQueue` from `queues/queues.ts` elsewhere in the codebase. The `notificationQueue` export stays. Verify no other file imports `orderQueue` from `queues/queues.ts` (as opposed to from `lib/queue.ts`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env safety for admin secret | Custom startup validator | Lazy-getter pattern (stripe.service.ts model) | Already established — consistent with codebase, zero new deps |
| AuthGate verification | Full Playwright E2E | Vitest unit test mocking `useAuth` | Phase is about verification, not UI testing; Playwright not in scope |
| Queue cleanup discovery | Manual search | `grep -r 'order-lifecycle'` across codebase | Deterministic; the dead queue is already identified by the audit |

**Key insight:** This phase is mechanical reconciliation — every item has a known answer from the milestone audit. The plan should execute, not re-discover.

## Common Pitfalls

### Pitfall 1: Removing Wrong Queue Export

**What goes wrong:** `queues/queues.ts` exports two queues — `notificationQueue` (live) and `orderQueue` as `'order-lifecycle'` (dead). Removing both breaks the notification system.

**Why it happens:** Both are in the same file, easy to delete all exports reflexively.

**How to avoid:** Remove only the `orderQueue` export from `queues/queues.ts`. Keep `notificationQueue`. Then grep for any file importing `orderQueue` specifically from `queues/queues.ts` to ensure no broken imports remain.

**Warning signs:** Any import like `import { orderQueue } from '../queues/queues.js'` — that import should be changed to use `lib/queue.ts` if it exists, or deleted if unused.

### Pitfall 2: Applying PAY-02 Fix That Is Already Applied

**What goes wrong:** The milestone audit said PAY-02 was `[x]` (misleading), but reading the current REQUIREMENTS.md shows it is already `[ ]` with strikethrough. The plan might redundantly re-apply the fix or apply it incorrectly.

**Why it happens:** The audit was run on 2026-04-08; the REQUIREMENTS.md was updated after the audit (last updated note says "after milestone audit gap closure — 22 checkboxes fixed"). The audit list may be stale for PAY-02.

**How to avoid:** Read current REQUIREMENTS.md state before writing. If PAY-02 is already `[ ]` with N/A note, no action needed. Verify, don't assume.

### Pitfall 3: Breaking timingSafeEqual in admin.ts Refactor

**What goes wrong:** The `verifyExchangeSignature` function uses `crypto.timingSafeEqual(sigBuffer, expBuffer)` which requires both buffers be the same length. If the refactor moves secret resolution inside the handler but doesn't update buffer construction, a missing secret causes a different crash path.

**Why it happens:** Refactoring without tracing all usages of `EXCHANGE_SECRET`.

**How to avoid:** When moving secret resolution inside the handler, ensure `verifyExchangeSignature` either receives `secret` as a parameter or is inlined. The 503 early return must happen BEFORE any call to `verifyExchangeSignature`.

### Pitfall 4: AuthGate Smoke Test Over-Engineering

**What goes wrong:** Writing a full integration test with a running Fastify server + browser simulation when a simple React unit test suffices.

**Why it happens:** Phase 6 integration tests set the expectation of HTTP-level testing.

**How to avoid:** AuthGate is a React component — it should be tested with Vitest + React Testing Library or a simple render test. `useAuth` can be mocked to return `{ isAuthenticated: false }` and the test asserts `LoginPage` renders. No Fastify instance needed.

## Code Examples

### Admin.ts Before (crash risk)

```typescript
// Source: apps/api/src/routes/auth/admin.ts (verified, line 10)
const EXCHANGE_SECRET = process.env.ADMIN_EXCHANGE_SECRET!
// ^ This throws ReferenceError on server import if env var missing
// ^ Because TypeScript non-null assertion does NOT add a runtime check
// ^ The ! is only a type system hint — process.env.X is still undefined at runtime
```

### Admin.ts After (graceful 503)

```typescript
// Target pattern — no module-level constant
export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/exchange', {
    schema: { body: ExchangeRequestSchema },
    handler: async (request, reply) => {
      const secret = process.env.ADMIN_EXCHANGE_SECRET
      if (!secret) {
        fastify.log.warn('[admin] ADMIN_EXCHANGE_SECRET not set — admin exchange disabled')
        return reply.status(503).send({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Admin exchange not configured',
        })
      }
      const { email, signature } = request.body as z.infer<typeof ExchangeRequestSchema>
      if (!verifyExchangeSignature(email, signature, secret)) {
        return reply.status(401).send({ ... })
      }
      // ... rest of handler unchanged
    },
  })
}

// verifyExchangeSignature now accepts secret as parameter
function verifyExchangeSignature(email: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(email).digest('hex')
  const sigBuffer = Buffer.from(signature.padEnd(64, '0').slice(0, 64))
  const expBuffer = Buffer.from(expected)
  return crypto.timingSafeEqual(sigBuffer, expBuffer)
}
```

### Dead Queue Removal Target

```typescript
// BEFORE: apps/api/src/queues/queues.ts
export const notificationQueue = new Queue('notifications', { ... })  // KEEP
export const orderQueue = new Queue('order-lifecycle', { ... })        // REMOVE — dead queue

// AFTER: apps/api/src/queues/queues.ts
export const notificationQueue = new Queue('notifications', { ... })  // only export
```

### Checkbox Update Pattern (REQUIREMENTS.md)

```markdown
<!-- BEFORE (22 instances like this): -->
- [ ] **DISC-01**: Customer can browse three service categories

<!-- AFTER: -->
- [x] **DISC-01**: Customer can browse three service categories
```

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this phase is code/config/artifact edits only, no new tools or services required).

## Validation Architecture

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is skipped.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Module-level `process.env.X!` non-null assertion | Lazy getter with graceful fallback | Phase 1 established Stripe pattern; Phase 7 applies it to admin.ts | Server no longer crashes when admin secret is absent in dev/CI |
| Company-web routes accessible without auth | `AuthGate` in `main.tsx` blocking unauthenticated access | Phase 6 | AUTH-03/AUTH-04 route protection satisfied |
| 22 Phase 2 requirements shown as `[ ]` pending | `[x]` reflecting verified state | Phase 7 | REQUIREMENTS.md accurately reflects v1.0 verification status |
| Dead `order-lifecycle` queue polluting Redis | Queue removed | Phase 7 | Removes wasted Redis connection, eliminates confusion |

## Open Questions

1. **Is the PAY-02 checkbox already fixed?**
   - What we know: REQUIREMENTS.md currently shows `[ ] **PAY-02**: ~~...~~ — N/A, scoped out of v1.0`
   - What's unclear: The milestone audit said it was `[x]` (misleading), but REQUIREMENTS.md was updated after the audit. The current file appears already correct.
   - Recommendation: Plan task should read REQUIREMENTS.md PAY-02 line first; if already `[ ]` with N/A, mark as verified-no-action. Do not blindly re-apply.

2. **Does `orderQueue` from `queues/queues.ts` have any remaining imports?**
   - What we know: The audit says it's dead. The real queue is in `lib/queue.ts`.
   - What's unclear: Whether any file still imports `orderQueue` from `queues/queues.ts`.
   - Recommendation: Plan task should grep `from.*queues/queues` across codebase before removing to identify any imports that need updating.

3. **What is the best test approach for AuthGate verification?**
   - What we know: Phase 6 VERIFICATION already confirms `AuthGate` exists and has the correct logic. The plan's Claude's discretion question is whether to add a smoke test.
   - What's unclear: Whether a new test adds meaningful value given Phase 6 already verified the artifact.
   - Recommendation: A single Vitest test in `apps/company-web/src/__tests__/auth-gate.test.tsx` that renders `AuthGate` with mocked `useAuth` returning `isAuthenticated: false` and asserts `LoginPage` renders. Low cost, adds regression protection.

## Sources

### Primary (HIGH confidence)
- `.planning/v1.0-MILESTONE-AUDIT.md` — Authoritative source for all 4 task items; read directly from filesystem
- `apps/company-web/src/main.tsx` — AuthGate implementation verified by direct file read
- `apps/api/src/routes/auth/admin.ts` — Crash-risk line 10 confirmed by direct file read
- `apps/api/src/queues/queues.ts` — Dead `order-lifecycle` queue confirmed by direct file read
- `apps/api/src/lib/queue.ts` — Canonical `orders` queue confirmed by direct file read
- `apps/api/src/services/stripe.service.ts` — Reference pattern for graceful env handling confirmed by direct file read
- `apps/api/src/test-helpers/build-app.ts` — `buildTestApp` helper confirmed available and in established use
- `.planning/phases/06-fix-route-socket-wiring/06-VERIFICATION.md` — Phase 6 pass status confirmed; AuthGate verified in context
- `.planning/REQUIREMENTS.md` — Current checkbox state read directly; PAY-02 already shows `[ ]` with N/A
- `.planning/config.json` — `nyquist_validation: false` confirmed

### Secondary (MEDIUM confidence)
- Phase 6 SUMMARY files (06-01, 06-02) — confirm AuthGate, socket fix, and test patterns delivered

### Tertiary (LOW confidence)
- None — all findings are from direct codebase reads

## Metadata

**Confidence breakdown:**
- AuthGate status: HIGH — directly verified by reading `main.tsx` and Phase 6 VERIFICATION.md
- Env fix pattern: HIGH — `stripe.service.ts` reference pattern read directly from codebase
- Checkbox list: HIGH — enumerated verbatim from milestone audit YAML frontmatter
- Dead queue: HIGH — both queue files read directly; `order-lifecycle` queue has no worker
- PAY-02 current state: HIGH — REQUIREMENTS.md read directly; already shows `[ ]` N/A

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable phase, no fast-moving external dependencies)
