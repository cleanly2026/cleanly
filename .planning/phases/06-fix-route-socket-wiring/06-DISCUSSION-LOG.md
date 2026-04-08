# Phase 6: Fix Cross-Phase Route & Socket Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 06-fix-route-socket-wiring
**Areas discussed:** Route prefix fix strategy, companyId auth wiring, Verification approach

---

## Route Prefix Fix Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Add /api prefix on server (Recommended) | Register all Fastify routes under /api prefix. Standard convention — all clients already expect /api/*, so one server-side change fixes everything consistently. | ✓ |
| Remove /api from client calls | Update washer-mobile (and any other client) to drop the /api prefix. Requires auditing all fetch/axios calls across all apps. | |
| You decide | Claude picks based on codebase patterns and minimal diff. | |

**User's choice:** Add /api prefix on server
**Notes:** None — straightforward choice. Server-side fix is cleaner than auditing all client apps.

---

## companyId Auth Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Decode from JWT (Recommended) | The company login already returns a JWT with companyId claim. Decode it client-side and store in React context. Simplest — no extra API calls. | ✓ |
| Dedicated /me endpoint | Add GET /api/companies/me that returns the authenticated company profile including ID. More explicit but adds a network call on every app load. | |
| You decide | Claude picks based on what the existing auth flow already provides. | |

**User's choice:** Decode from JWT
**Notes:** None — leverages existing JWT claims, no new endpoints needed.

---

## Verification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted integration tests (Recommended) | Write 3 focused integration tests: (1) PATCH /api/orders/:id/status returns 200, (2) company socket join receives events, (3) company orders endpoint returns scoped data. Automated and repeatable. | ✓ |
| Manual smoke test only | Run all apps, walk through the flows manually. Quick but not repeatable. | |
| You decide | Claude picks the verification depth appropriate for the scope. | |

**User's choice:** Targeted integration tests
**Notes:** None — 3 tests, one per fix.

---

## Claude's Discretion

- /api prefix wrapping strategy (top-level vs per-route-group)
- JWT decode utility structure in company-web
- Socket join fix implementation details
- Integration test framework and file organization

## Deferred Ideas

None — discussion stayed within phase scope.
