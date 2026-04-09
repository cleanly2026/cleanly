# Phase 07: Auth Guards & Housekeeping - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase closes remaining tech debt and planning artifact drift. Three deliverables: (1) verify company-web route protection, (2) fix crash-risk env assertion in admin auth, (3) reconcile REQUIREMENTS.md checkboxes against actual verification status. No new features, no UI changes.

</domain>

<decisions>
## Implementation Decisions

### Route Guard Scope
- **D-01:** Phase 6 already added `AuthGate` in `apps/company-web/src/main.tsx` (lines 13-42) that gates all routes behind `LoginPage`/`MfaPage` when `!isAuthenticated`. Unauthenticated users cannot reach `/orders`, `/packages`, or `/washers` — they see login instead. Verify this satisfies success criterion 1 and add a smoke test if needed. No additional per-route guards required unless AuthGate is bypassed.

### Env Assertion Strategy
- **D-02:** `apps/api/src/routes/auth/admin.ts` line 10 uses `process.env.ADMIN_EXCHANGE_SECRET!` — the non-null assertion means the server module crashes on import if the env var is missing. Fix: replace with a graceful fallback that logs a warning and disables the admin exchange route (returns 503) instead of crashing the entire Fastify server. This prevents dev/CI environments without the secret from failing to start.

### Checkbox Audit Approach
- **D-03:** Read all `*-VERIFICATION.md` files across phases 1-6. For each requirement ID referenced, check whether it passed verification. Update REQUIREMENTS.md checkboxes to `[x]` for verified requirements and ensure none are falsely checked. The milestone audit identified 22 stale checkboxes and 1 misleading PAY-02 checkbox — fix all of them.

### Dead Queue Cleanup
- **D-04:** The milestone audit identified dead/unused queue references. Remove any queue imports or registrations that reference queues not actually used in the current codebase. Lightweight grep + cleanup.

### Claude's Discretion
- Test approach for route guard verification (unit test vs integration test vs manual check)
- Exact error message format for missing ADMIN_EXCHANGE_SECRET
- Whether to add env validation at server startup vs lazy check in route handler

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Audit (primary source of all gap items)
- `.planning/v1.0-MILESTONE-AUDIT.md` — Lists all gaps: route guard, env assertion, stale checkboxes, dead queues

### Phase 6 Summaries (predecessor work)
- `.planning/phases/06-fix-route-socket-wiring/06-01-SUMMARY.md` — Route prefix fix details
- `.planning/phases/06-fix-route-socket-wiring/06-02-SUMMARY.md` — Auth context + socket fix details

### Key Source Files
- `apps/company-web/src/main.tsx` — AuthGate implementation (Phase 6)
- `apps/company-web/src/lib/auth-context.tsx` — Auth context with JWT decode
- `apps/company-web/src/router.tsx` — Routes protected by AuthGate
- `apps/api/src/routes/auth/admin.ts` — ADMIN_EXCHANGE_SECRET crash risk (line 10)
- `.planning/REQUIREMENTS.md` — Checkbox reconciliation target

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthGate` in `main.tsx`: Already gates all company-web routes behind authentication
- `useAuth()` hook: Provides `isAuthenticated`, `companyId`, `login`, `logout`
- `buildTestApp` in `apps/api/src/test-helpers/build-app.ts`: Can be reused for admin route testing

### Established Patterns
- Phase 6 auth pattern: JWT decode via `atob()`, localStorage persistence, socket connect on login
- Phase 6 test pattern: `vitest` with mocked prisma/socket, `x-test-user` header for auth
- Env handling: `stripe.service.ts` throws on missing `STRIPE_SECRET_KEY` — admin.ts should be more graceful

### Integration Points
- `apps/api/src/server.ts`: Where admin routes are registered (prefix `/api/auth/admin`)
- `.planning/REQUIREMENTS.md`: Target file for checkbox reconciliation
- All `*-VERIFICATION.md` files: Source of truth for requirement status

</code_context>

<specifics>
## Specific Ideas

No specific requirements — this is a cleanup/housekeeping phase with well-defined mechanical tasks from the milestone audit.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-auth-guards-housekeeping*
*Context gathered: 2026-04-09*
