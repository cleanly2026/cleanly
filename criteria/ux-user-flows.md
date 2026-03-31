# UX & User Flows Criteria — Cleanly Platform

> Evaluator type: AI agent (gsd-evaluator) | Scoring: 1-10 per dimension
> Weighting: Task Completion, Info Architecture, Product Depth, and Bilingual UX weighted **1.5x**; Feedback and Onboarding weighted **1x**.

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific flows, screens, or interactions as evidence. If you are unsure whether something meets a threshold, score it lower and explain why.

## Context

Cleanly has 4 distinct user roles (customer, washer, company admin, platform admin) each with different flows across different app surfaces. Core flows: customer books service → pays → tracks washer arrival → service completed → reviews. Company: accepts orders → assigns washers → manages fleet. Washer: receives assignment → navigates to customer → starts/completes job → uploads photos. Admin: verifies companies → monitors orders → handles disputes.

Two service delivery models:
- **On-site** (car wash, sofa cleaning): 7-state lifecycle — pending → accepted → washer_assigned → washer_en_route → in_progress → completed (or cancelled)
- **Carpet** (pickup/return): 10-state lifecycle — pending → accepted → pickup_scheduled → picked_up → in_cleaning → ready_for_return → return_scheduled → out_for_return → returned (or cancelled)

## Dimensions

### 1. Task Completion (Weight: 1.5x)

Can each user role complete their core tasks end-to-end without confusion or dead ends?

| Score | Description |
|-------|-------------|
| 9-10  | All core flows seamless across all roles. Customer: browse → book → pay → track → review. Company: accept → assign → monitor → complete. Clear entry points, logical steps, obvious completion states. No dead ends. |
| 7-8   | Core flows work well. Minor friction points (e.g., unclear next step after booking confirmation). |
| 5-6   | Flows are completable but require guessing. Missing confirmation states, unclear what happens after payment, washer status updates delayed or unclear. |
| 3-4   | Some core flows have dead ends. Payment succeeds but no order confirmation. Washer assigned but no notification sent. |
| 1-2   | Primary tasks cannot be completed. Booking flow breaks, payment doesn't process, order tracking non-functional. |

### 2. Information Architecture (Weight: 1.5x)

Is content organized to match each role's mental model? Customer sees service catalog organized by need (car wash, carpet, sofa). Company sees operational dashboard. Admin sees platform oversight.

| Score | Description |
|-------|-------------|
| 9-10  | Intuitive per-role structure. Customer navigates by service type → company → package. Company dashboard groups by operational priority (pending orders, active jobs, washer fleet). Admin has clear company verification, order monitoring, and analytics sections. |
| 7-8   | Logical organization with minor surprises. Most things where expected per role. |
| 5-6   | Adequate but some features buried. Customer can't easily find order history. Company has to dig for washer availability. |
| 3-4   | Confusing. Features in unexpected places, illogical groupings, customer sees company-level detail they don't need. |
| 1-2   | No coherent structure per role. All roles see similar generic layouts. |

### 3. Product Depth (Weight: 1.5x)

Are features fully built or surface-level shells? Both order lifecycle models work completely. Edge cases: what happens when a washer cancels mid-job? When payment fails after order accepted? When a carpet return date needs to change?

| Score | Description |
|-------|-------------|
| 9-10  | Every feature complete. Both order lifecycles (on-site 7-state, carpet 10-state) work end-to-end with all transitions. Edge cases handled: cancellation at any state, payment retry, washer reassignment, return date modification. Settings persist, advanced options work. |
| 7-8   | Core features deep and complete. A few secondary features shallow (e.g., carpet return date change not implemented). |
| 5-6   | Happy paths work but features lack depth. On-site booking works but carpet lifecycle incomplete. Cancellation only works from pending state. |
| 3-4   | Most features surface-level. Booking form exists but payment doesn't actually process. Order tracking shows static state. |
| 1-2   | Features are facades. Buttons exist but do nothing, forms don't save, core booking flow is broken. |

### 4. Feedback & State Communication (Weight: 1x)

Does the UI keep users informed? Loading states during API calls, success/error toasts, order status updates, washer ETA updates, payment confirmation, empty states for new users with no orders.

| Score | Description |
|-------|-------------|
| 9-10  | Every action has clear feedback. Booking confirmation with order summary. Payment processing indicator. Real-time washer location updates. Push notification for status changes. Meaningful empty states ("No orders yet — book your first cleaning!"). Error messages specific and actionable. |
| 7-8   | Good feedback for most actions. A few silent operations or missing empty states. |
| 5-6   | Basic feedback. Some actions confirm, others leave users guessing. Payment processes but no clear confirmation screen. |
| 3-4   | Sparse. Actions happen silently. Order placed but no confirmation. Payment charged but no receipt. |
| 1-2   | No feedback. Users click and nothing visibly happens. |

### 5. Onboarding & Discoverability (Weight: 1x)

Can a first-time user of each role understand the app immediately? Customer: "I need my car washed" → obvious path. Company: "I need to manage incoming orders" → obvious dashboard. Washer: "I need to see my next job" → obvious job queue.

| Score | Description |
|-------|-------------|
| 9-10  | Self-explanatory for all roles. Customer immediately sees how to book. Company dashboard shows pending orders prominently. Washer app shows current assignment front-and-center. |
| 7-8   | Mostly self-explanatory. One or two features require discovery but core value immediately clear per role. |
| 5-6   | Requires exploration. Purpose clear but how to accomplish first booking/order isn't immediately obvious. |
| 3-4   | Confusing for new users of any role. Key features hidden, purpose unclear. |
| 1-2   | Impenetrable. A new user would not know what the app does or how to start. |

### 6. Bilingual UX (Weight: 1.5x)

Does the bilingual experience work seamlessly? Language switching preserves current state (doesn't navigate away). All visible strings translated (no mixed-language screens). Date/time formatting locale-aware. Currency (AED) displays correctly in both languages. Numbers use correct numeral system per locale preference.

| Score | Description |
|-------|-------------|
| 9-10  | Seamless bilingual experience. Language toggle instant and preserves state. 100% of strings translated. Dates show "25 مارس" in Arabic, "March 25" in English. AED amounts formatted correctly. No mixed-language UI anywhere. URL-based locale routing works. |
| 7-8   | Strong bilingual support. Minor untranslated strings in secondary screens. Language switch works but may briefly flash. |
| 5-6   | Basic bilingual. Major screens translated but settings, error messages, or admin tools show English-only. Date/number formatting inconsistent. |
| 3-4   | Partial translation. Primary UI in both languages but forms, validation messages, and toasts English-only. Language switch loses current state. |
| 1-2   | No functional bilingual support. Language toggle exists but barely changes anything. Arabic users see mostly English. |

## Scoring Formula

```
Weighted Score = ((Task Completion * 1.5) + (Info Architecture * 1.5) + (Product Depth * 1.5) + Feedback + Onboarding + (Bilingual UX * 1.5)) / 8
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Task Completion or Product Depth scoring **4 or below** also triggers a fail — if users can't complete core tasks or features are hollow, nothing else matters.
