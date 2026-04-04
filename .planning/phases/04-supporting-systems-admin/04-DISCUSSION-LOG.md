# Phase 4: Supporting Systems & Admin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 04-supporting-systems-admin
**Areas discussed:** Notification channels & triggers, Admin panel UX & layout, Private beta readiness, Refund & dispute handling

---

## Notification Channels & Triggers

### Q1: Which order events trigger notifications?

| Option | Description | Selected |
|--------|-------------|----------|
| Key milestones only | 4 events: confirmed, en route, completed, refund | |
| Full lifecycle coverage | ~10 events including all state transitions | ✓ |
| You decide | Claude picks based on competitor apps | |

**User's choice:** Full lifecycle coverage
**Notes:** All order state transitions trigger notifications to customers.

### Q2: Which channels per event?

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered approach | Push for all, SMS+WhatsApp for critical, email for receipts | ✓ |
| All channels for everything | Every event on all channels | |
| Customer preference | Let customers choose channels in settings | |

**User's choice:** Tiered approach
**Notes:** Reduces cost and avoids notification fatigue.

### Q3: WhatsApp template strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| Design templates now | Define bilingual templates, submit during development | ✓ |
| Placeholder first | Code integration with placeholders, finalize later | |
| Skip WhatsApp for beta | Defer NOTF-03, launch with push+SMS+email only | |

**User's choice:** Design templates now
**Notes:** Start 360dialog setup and Meta template approval early.

### Q4: Washer notifications?

| Option | Description | Selected |
|--------|-------------|----------|
| Customer + washer notifications | Washers get push for job assignment, cancellation, schedule changes | ✓ |
| Customer-only for now | Defer washer push notifications | |

**User's choice:** Customer + washer notifications
**Notes:** Push-only for washers (no SMS/WhatsApp/email).

---

## Admin Panel UX & Layout

### Q1: Navigation structure?

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar navigation | Fixed left sidebar: Dashboard, Companies, Orders, Disputes, Cities/Categories, Audit Log | ✓ |
| Top nav with tabs | Horizontal nav bar | |
| You decide | Claude picks best pattern | |

**User's choice:** Sidebar navigation
**Notes:** Standard admin panel pattern, collapsible on mobile.

### Q2: Company review workflow?

| Option | Description | Selected |
|--------|-------------|----------|
| Detail page with approve/reject | Click pending company → full profile → approve/reject with reason | ✓ |
| Inline review in table | Quick approve/reject from table row | |
| Multi-step review | Staged review process | |

**User's choice:** Detail page with approve/reject
**Notes:** Rejection reason sent to company.

### Q3: Dashboard landing page?

| Option | Description | Selected |
|--------|-------------|----------|
| Essential metrics only | 4 stat cards + recent orders table | ✓ |
| Richer overview | Charts, revenue, city breakdown | |
| You decide | Claude picks dashboard density | |

**User's choice:** Essential metrics only
**Notes:** Today's orders, active washers, pending reviews, open disputes.

### Q4: Audit log display?

| Option | Description | Selected |
|--------|-------------|----------|
| Action + timestamp + admin | Simple filterable table | ✓ |
| Full diff logging | Before/after state for every change | |
| You decide | Claude picks audit depth | |

**User's choice:** Action + timestamp + admin
**Notes:** Filterable by action type and admin user.

---

## Private Beta Readiness

### Q1: Beta surface readiness?

| Option | Description | Selected |
|--------|-------------|----------|
| All surfaces full flow | All 5 surfaces feature-complete | |
| Core 3 full, admin + company polish later | Customer + washer rock-solid, dashboard + admin functional | ✓ |
| Mobile-first beta | Customer mobile + washer mobile focus | |

**User's choice:** Core 3 full, admin + company polish later
**Notes:** Company dashboard and admin panel functional but rough edges acceptable.

### Q2: Seed data?

| Option | Description | Selected |
|--------|-------------|----------|
| Full seed script | 3 demo companies, sample orders, test accounts | ✓ |
| Minimal seed | One company with basic packages | |
| No seed needed | Real companies onboard themselves | |

**User's choice:** Full seed script
**Notes:** Beta testers see a populated app from first launch.

### Q3: Integration testing?

| Option | Description | Selected |
|--------|-------------|----------|
| Automated E2E | Playwright test for full booking flow | |
| Manual test checklist | Written checklist for human verification | ✓ |
| Skip for beta | Rely on per-phase verification | |

**User's choice:** Manual test checklist
**Notes:** Faster to create than automated E2E.

### Q4: Polish items?

| Option | Description | Selected |
|--------|-------------|----------|
| Error states & loading | Add error boundaries, loading skeletons, empty states | ✓ |
| You know best | Claude audits and identifies gaps | |
| Let me describe specific items | User has specific things in mind | |

**User's choice:** Error states & loading
**Notes:** Across all screens currently lacking them.

---

## Refund & Dispute Handling

### Q1: Dispute evidence viewer?

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side photo viewer | Before/after photos side-by-side + order details | ✓ |
| Timeline view | Chronological timeline with inline photos | |
| You decide | Claude picks best UX | |

**User's choice:** Side-by-side photo viewer
**Notes:** Single scrollable dispute page.

### Q2: Refund options?

| Option | Description | Selected |
|--------|-------------|----------|
| Full or partial refund | Admin enters custom amount + reason | ✓ |
| Full refund only | Simpler for beta | |
| Full + partial + credit | Most flexible but adds wallet scope | |

**User's choice:** Full or partial refund
**Notes:** Stripe refund API already implemented, admin needs UI to trigger it.

### Q3: Who initiates disputes?

| Option | Description | Selected |
|--------|-------------|----------|
| Customer-initiated in app | "Report issue" button on completed orders | ✓ |
| Admin-only (external support) | Customer contacts support, admin creates dispute | |
| Both paths | In-app + admin manual creation | |

**User's choice:** Customer-initiated in app
**Notes:** Customer selects reason, optionally adds note, creates dispute record.

---

## Claude's Discretion

- Notification template text/copy for each event and channel
- BullMQ worker architecture for notification dispatch
- Admin panel component library
- Dispute reason categories/enum values
- Seed data specifics
- Error boundary implementation pattern
- Manual test checklist structure
- City/category management CRUD

## Deferred Ideas

None — discussion stayed within phase scope.
