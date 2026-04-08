# Phase 5: Wire Washer Job Dispatch Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 05-wire-washer-job-dispatch
**Areas discussed:** Accept/decline channel, Job alert payload, Decline & reassignment, Socket handler location

---

## Accept/Decline Channel

| Option | Description | Selected |
|--------|-------------|----------|
| Socket-only (Recommended) | Remove HTTP endpoint, handle everything via socket events. Simpler, real-time, matches the client code already built. | ✓ |
| Socket primary + HTTP fallback | Socket is the main path, but keep the HTTP endpoint as a fallback for edge cases. | |
| Keep both independently | Both socket and HTTP endpoints work. More flexibility but risk of duplicate handling. | |

**User's choice:** Socket-only (Recommended)
**Notes:** Client code (useWasherSocket.ts, alert.tsx) already uses socket events exclusively. HTTP endpoint becomes dead code.

---

## Job Alert Payload

| Option | Description | Selected |
|--------|-------------|----------|
| Current fields are enough (Recommended) | orderId, serviceType, companyName, customerAddress, lat/lng, estimatedDistance. Alert screen already renders these. | ✓ |
| Add package name + price | Washer sees what service package and how much it's worth. Needs minor alert screen UI update. | |
| Add package + customer first name | Package details plus customer's first name for a personal touch. | |

**User's choice:** Current fields are enough (Recommended)
**Notes:** No UI changes needed — alert screen already renders the existing JobAlert type fields.

---

## Decline & Reassignment

| Option | Description | Selected |
|--------|-------------|----------|
| Revert to company (Recommended) | Order reverts to 'accepted' status, washer_id cleared. Company manually picks another washer. | ✓ |
| Auto-reassign next washer | Server picks next available online washer from same company and auto-dispatches. | |
| Revert + notify company | Same as revert, but also push a notification to company admin. | |

**User's choice:** Revert to company (Recommended)
**Notes:** Matches existing decline logic in lifecycle.ts. Simple approach — no availability tracking needed.

---

## Socket Handler Location

| Option | Description | Selected |
|--------|-------------|----------|
| Separate module (Recommended) | Create job-dispatch.ts socket handler module. socket.ts stays lean. | ✓ |
| Inline in socket.ts | Add handlers directly in socket.ts alongside existing ones. Fewer files. | |
| You decide | Claude picks the best approach based on codebase patterns. | |

**User's choice:** Separate module (Recommended)
**Notes:** Keeps socket.ts as connection/setup hub. Job dispatch logic (with Prisma queries, BullMQ cancellation) gets its own file.

---

## Claude's Discretion

- Error handling approach for socket events
- Shared transition logic extraction
- BullMQ timer job naming and cancellation
- HTTP washer-response endpoint removal vs deprecation

## Deferred Ideas

None — discussion stayed within phase scope
