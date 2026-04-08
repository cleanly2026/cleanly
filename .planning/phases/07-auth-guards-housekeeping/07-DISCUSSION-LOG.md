# Phase 07: Auth Guards & Housekeeping - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 07-auth-guards-housekeeping
**Areas discussed:** Route guard scope, Env assertion strategy, Checkbox audit approach
**Mode:** --auto (all decisions auto-selected)

---

## Route Guard Scope

| Option | Description | Selected |
|--------|-------------|----------|
| AuthGate is sufficient | Verify Phase 6 AuthGate covers success criteria, add smoke test | ✓ |
| Add per-route guards | Wrap each route with individual auth checks | |
| Add React Router loader guards | Use route loaders to check auth before rendering | |

**User's choice:** AuthGate is sufficient (auto-selected: recommended default)
**Notes:** Phase 6 already implemented AuthGate in main.tsx. Unauthenticated users see login, not dashboard routes.

---

## Env Assertion Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful error — warn and disable route | Log warning, return 503 on admin exchange route | ✓ |
| Throw at startup | Keep current behavior but with clear error message | |
| Lazy check in handler | Check env var on each request, return 500 if missing | |

**User's choice:** Graceful error — warn and disable route (auto-selected: recommended default)
**Notes:** Prevents server crash in dev/CI environments without ADMIN_EXCHANGE_SECRET configured.

---

## Checkbox Audit Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Read VERIFICATION.md files and reconcile | Cross-reference all verification results against REQUIREMENTS.md | ✓ |
| Automated script | Write a script to parse and update checkboxes | |

**User's choice:** Read VERIFICATION.md files and reconcile (auto-selected: recommended default)
**Notes:** 22 stale checkboxes + 1 misleading PAY-02 identified in milestone audit.

---

## Claude's Discretion

- Test approach for route guard verification
- Exact error message format for missing env var
- Env validation timing (startup vs lazy)

## Deferred Ideas

None
