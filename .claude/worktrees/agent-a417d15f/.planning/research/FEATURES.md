# Feature Research

**Domain:** On-demand cleaning/car wash services marketplace (Gulf region — UAE first)
**Researched:** 2026-03-31
**Confidence:** MEDIUM-HIGH (competitive landscape verified via multiple sources; Gulf-specific competitors analyzed; carpet pickup-return lifecycle inferred from analogous laundry/dry-cleaning software since no direct carpet marketplace app with this model was found as a public reference)

---

## Service Model Overview

Cleanly operates two distinct service delivery models that share a booking interface but diverge completely in lifecycle:

| Model | Services | Delivery | Order Duration |
|-------|----------|----------|----------------|
| **On-site** | Car wash, sofa cleaning | Washer travels to customer location | Same-day, 1–3 hours |
| **Pickup-and-return** | Carpet cleaning | Washer picks up carpet, cleans at facility, returns on agreed date | Multi-day, typically 3–7 days |

These two models require different order status machines, different scheduling UIs, and different notification strategies.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features present in every competitive app in this category. Missing any of these = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Phone OTP authentication | Standard Gulf user onboarding pattern; no password friction | LOW | Twilio. Companies need email+MFA separately |
| Service category browsing | Users must discover what's available before booking | LOW | Three categories: car wash, carpet, sofa |
| Company listings with ratings + pricing | Core marketplace promise — pick a company | MEDIUM | Must show rating, price range, ETA, availability |
| GPS-based location detection | Service availability is city/zone dependent; affects which companies show | MEDIUM | Auto-detect on open, manual override required |
| Package and add-on selection | All competitors offer tiered packages (basic, premium, deluxe) | LOW | Quantity support needed for carpet (multiple items) |
| Real-time washer GPS tracking | Customers expect Uber-like "where is my washer?" visibility | HIGH | Socket.io live updates. On-site model only during travel |
| In-app payment (card + Apple/Google Pay) | Cashless is expected; cash not scalable | HIGH | Stripe Elements + Apple Pay + Google Pay + wallet |
| Order status updates (push + SMS) | Customers need confirmation, reminders, status changes | MEDIUM | Push (Expo) + SMS (Twilio) minimum |
| WhatsApp notifications | Gulf region has ~95%+ WhatsApp penetration; competitors use it | MEDIUM | 360dialog. Critical differentiator locally but actually now table stakes in UAE market |
| Order history / booking history | Users expect to see past orders and rebooking capability | LOW | Standard list view with receipt |
| Customer reviews and ratings per company | Trust signal; marketplace requires it | MEDIUM | 1–5 star + text. Shown on company listing |
| Cancellation and rescheduling | Users expect flexibility; no cancellation = complaints | MEDIUM | Policy enforcement (e.g., free cancel >2h before) |
| Before/after photo evidence | Quality proof; reduces disputes; expected in detail-level services | HIGH | Washer uploads photos at job start + end via mobile app |
| Company onboarding (profile, pricing, zones) | Companies need self-service setup to scale supply side | MEDIUM | Covers service zones, packages, working hours |
| Company order management dashboard | Companies must accept, assign, and track their own orders | MEDIUM | Accept/reject, assign to washer, view schedule |
| Washer mobile app (job management + GPS) | Washers need dedicated tooling for job execution | HIGH | Job list, navigation, checklist, photo upload, status updates |
| Admin panel — platform oversight | Platform needs to oversee companies, orders, payouts, disputes | HIGH | Separate web app, not embedded in company dashboard |
| Bilingual Arabic (RTL) + English | UAE market requirement; Arabic-speaking users are majority of base | HIGH | Must be day-1, not retrofittable |
| Per-category service checklists (washer side) | Car wash, sofa, carpet each have different steps; reduces mistakes | LOW | Simple checklist per category the washer ticks off |
| Email notifications | Booking confirmation, receipts, company-facing reports | LOW | Resend |

---

### Carpet Pickup-and-Return: Additional Table Stakes

These features exist only for the carpet cleaning service model and are absent from on-site services.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Return date selection at booking | Customers agree on return date upfront; this is the contract | MEDIUM | Date picker with company-configured lead time (min days) |
| Extended order status machine | Carpet orders have more states than on-site (see lifecycle below) | HIGH | 10 statuses vs 7 for on-site (see lifecycle section) |
| Pickup scheduling (separate time slot) | The pickup itself is a scheduled appointment, not immediate dispatch | MEDIUM | Washer arrives to collect; customer must be present |
| Pickup confirmation + photo | Proof of item received (condition, quantity); critical for liability | MEDIUM | Washer photographs carpet at pickup, uploads immediately |
| "Your carpet is being cleaned" status | Multi-day idle phase: customer needs to know item is at facility | LOW | Status update only; no real-time tracking needed |
| Return scheduling and coordination | Company confirms exact return date/time, customer must be present | MEDIUM | Notification + optional reschedule of return |
| Return delivery GPS tracking | When washer is en route to return the carpet, Uber-like tracking resumes | HIGH | Same Socket.io mechanism reused |
| Return confirmation + delivery photo | Proof of return (condition check); closes the order | MEDIUM | Washer photographs carpet on return, customer sign-off |
| Rescheduling return date | Customers may need to change return day; companies must accommodate | MEDIUM | Both parties can request, platform mediates |

**Carpet order lifecycle (10 states):**
```
PENDING → ACCEPTED → PICKUP_SCHEDULED → PICKED_UP
→ IN_CLEANING → READY_FOR_RETURN → RETURN_SCHEDULED
→ OUT_FOR_RETURN → RETURNED → COMPLETED
(+ CANCELLED at any stage before PICKED_UP)
```

**On-site order lifecycle (7 states):**
```
PENDING → ACCEPTED → WASHER_ASSIGNED → WASHER_EN_ROUTE
→ IN_PROGRESS → COMPLETED
(+ CANCELLED before IN_PROGRESS)
```

---

### Differentiators (Competitive Advantage)

Features that go beyond the category baseline. Not expected, but valued. Cleanly should focus on 2–3 and do them well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Loyalty points + wallet | Drives repeat bookings; Justlife and Matic both use this | MEDIUM | Points earned per order, redeemable as wallet credit at checkout |
| Promo codes and discount engine | Customer acquisition tool; flash promos drive volume | MEDIUM | Fixed/percentage/minimum-order rules; expiry dates |
| Company-level analytics dashboard | Helps companies understand their business; creates platform stickiness | MEDIUM | Revenue charts, order volume, top services, rating trends |
| Stripe Connect payouts to companies | Automated, transparent payouts vs. manual bank transfers | HIGH | 15-20% commission auto-deducted; company sees net earnings |
| Eco-friendly / waterless badge | Differentiation for car wash companies; rising Gulf demand | LOW | Badge on listing; filter option. Data comes from company profile |
| Verified company badges (platform-vetted) | Trust signal; Gulf customers care about credential verification | LOW | Admin marks company as verified after review |
| Preferred washer selection | Repeat customers want same washer; Justlife offers this | MEDIUM | Enabled only if customer has prior completed order with that washer |
| Real-time ETA accuracy display | "Your washer is 8 minutes away" vs just "on the way" | MEDIUM | Requires live route calculation (Google Maps Distance Matrix API) |
| In-app photo timeline | Before/after photos presented as visual evidence in order history | LOW | UI layer on top of already-stored photos |
| Company response time display | Shows how quickly a company typically accepts orders | LOW | Computed metric shown on listing |
| Washer performance metrics (company-facing) | Companies see individual washer ratings, jobs completed, on-time rate | MEDIUM | Data already collected; dashboard display |

---

### Anti-Features (Things to Deliberately NOT Build)

Features that seem useful but create significant problems.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| In-app chat / messaging | Customers want to contact their washer | Complex to build safely; creates off-platform dynamics; support burden | WhatsApp deep-link pre-filled with order reference. Keep comms in notifications |
| Real-time availability calendar (customer-facing) | Customers want to see open slots | Company scheduling is fluid; stale data causes false expectations; complex sync | Show "usually responds in X minutes"; let company accept/reject |
| Instant auto-dispatch (platform assigns washer) | Faster booking experience | Breaks marketplace trust model; companies lose control; mismatch risk high | Keep marketplace model: company accepts, company assigns washer |
| Subscriptions / recurring bookings at launch | Obvious upsell; Matic and Justlife have it | Different payment logic, cancellation handling, promo interaction; complicates everything | Defer to v1.x; day-1 loyalty points are the retention mechanism |
| AI-powered pricing recommendations | Competitive pricing intelligence | Needs data volume (1000+ orders minimum) to be accurate; premature optimization | Static pricing by company; AI pricing in v2+ after data exists |
| Chatbot / virtual assistant | 24/7 support at scale | Hallucination risk; no data yet; Arabic language model quality unreliable | Human support via WhatsApp; chatbot only when support load justifies it |
| Fleet/B2B bulk booking (corporate car washing) | High-value contracts | Completely different sales motion, contract structure, billing; distraction at launch | Explicitly defer to Phase 3 per PROJECT.md |
| Payment splitting / group booking | Edge case request | Adds significant payment logic complexity for <1% use case | Single-payer model; not a problem in this category |
| Public reviews on company profile without order verification | Broader review pool | Fake reviews; no incentive for honest reviews; trust damage | Reviews only from verified completed orders |

---

## Feature Dependencies

```
GPS city detection
    └──requires──> booking flow (which companies to show)
                       └──requires──> package selection
                                          └──requires──> Stripe payment

Real-time washer tracking
    └──requires──> washer mobile app (GPS broadcast)
                       └──requires──> Socket.io infrastructure

Before/after photos
    └──requires──> washer mobile app (camera upload)
                       └──requires──> Cloudflare R2 signed URL storage

Reviews + ratings
    └──requires──> completed order (order lifecycle management)

Loyalty points
    └──requires──> Stripe payment (order completion triggers point award)
    └──requires──> wallet balance (redemption at checkout)

Promo codes
    └──requires──> Stripe payment (discount applied at charge time)

Company payouts
    └──requires──> Stripe Connect (connected account per company)
    └──requires──> commission engine (platform fee deduction)

Carpet return scheduling
    └──requires──> carpet-specific order lifecycle (10 states)
    └──requires──> return GPS tracking (reuses on-site tracking infrastructure)

Analytics dashboard (company)
    └──requires──> order data (Phase 1 must produce structured events)
    └──requires──> completed orders volume (meaningful only after ~50+ orders)

WhatsApp notifications
    └──requires──> 360dialog account + template approval (1-2 week lead time)
    └──enhances──> SMS notifications (same trigger points, different channel)

Admin panel
    └──requires──> company onboarding (something to manage)
    └──requires──> order management (something to oversee)
```

### Dependency Notes

- **WhatsApp requires 360dialog template pre-approval:** Meta requires template submission and approval before sending transactional WhatsApp messages. This takes 1–2 weeks. Must start this process before Phase 1 shipping, not after.
- **Stripe Connect requires company KYC:** Each company must complete Stripe identity verification before receiving payouts. This is a supply-side onboarding blocker.
- **Carpet lifecycle requires a separate state machine:** Do not attempt to extend the on-site lifecycle — model them as two separate entities in the database from Phase 1.
- **Analytics requires clean event data from day 1:** If order events are not structured properly in Phase 1, retroactively building analytics in Phase 3 is painful. Emit structured events from the start even if the dashboard isn't built yet.

---

## MVP Definition

### Launch With (v1) — Private Beta

Minimum set to validate the complete booking-to-completion flow with real companies and customers.

- [ ] Phone OTP auth for customers and washers — no auth = no flow
- [ ] Company email/password auth — supply side needs to log in
- [ ] Service category browsing + GPS city detection — discovery
- [ ] Company listings with ratings and pricing — core marketplace
- [ ] Package and add-on selection — value configuration
- [ ] Stripe payment (card + Apple Pay + Google Pay + wallet) — monetization
- [ ] On-site order lifecycle (7 states) — car wash + sofa flow
- [ ] Carpet order lifecycle (10 states) — distinct pickup-return model
- [ ] Real-time washer GPS tracking — the "wow" moment for customers
- [ ] Before/after photo evidence — quality proof, dispute reduction
- [ ] Per-category service checklists (washer app) — execution quality
- [ ] Customer reviews and ratings — trust for next customer
- [ ] Company dashboard: order management + washer assignment — supply side tooling
- [ ] Washer mobile app: job list, GPS, checklist, camera — execution tooling
- [ ] Push notifications (Expo) + SMS (Twilio) + WhatsApp (360dialog) — all three at launch (WhatsApp is expected in UAE)
- [ ] Bilingual Arabic (RTL) + English — required at launch, not retrofittable
- [ ] Admin panel: company approval, order oversight, dispute handling — platform governance
- [ ] Stripe Connect payouts to companies — companies won't operate without payment

### Add After Validation (v1.x) — Post Private Beta

Add once core loop is proven and first cohort of companies + customers are active.

- [ ] Loyalty points + wallet — add when retention metrics show drop-off after first order
- [ ] Promo codes + discount engine — add for first marketing push / growth sprint
- [ ] Company analytics dashboard — add when companies start asking "how am I doing?"
- [ ] Preferred washer selection — add when repeat booking rate is measurable
- [ ] Eco-friendly / verified badges — add when supply side differentiates on quality

### Future Consideration (v2+)

Defer until product-market fit is established and the mentioned triggers apply.

- [ ] Subscriptions / recurring bookings — after 500+ active customers with 3+ orders each
- [ ] AI pricing recommendations — after 1,000+ orders of training data
- [ ] Arabic chatbot for support — after support volume justifies it
- [ ] Fleet / B2B corporate accounts — separate sales motion; build separately
- [ ] Multi-region (KSA, Egypt) — after UAE unit economics are positive
- [ ] Mattress / curtain cleaning categories — after core 3 categories are profitable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Phone OTP auth | HIGH | LOW | P1 |
| Company listings + GPS filtering | HIGH | MEDIUM | P1 |
| Package selection + Stripe payment | HIGH | HIGH | P1 |
| On-site order lifecycle | HIGH | MEDIUM | P1 |
| Carpet pickup-return lifecycle | HIGH | HIGH | P1 |
| Real-time washer GPS tracking | HIGH | HIGH | P1 |
| Before/after photos | HIGH | MEDIUM | P1 |
| Washer mobile app | HIGH | HIGH | P1 |
| Bilingual Arabic RTL | HIGH | HIGH | P1 |
| Push + SMS + WhatsApp notifications | HIGH | MEDIUM | P1 |
| Company dashboard (order management) | HIGH | MEDIUM | P1 |
| Stripe Connect payouts | HIGH | HIGH | P1 |
| Admin panel | MEDIUM | HIGH | P1 |
| Per-category checklists | MEDIUM | LOW | P1 |
| Customer reviews and ratings | HIGH | MEDIUM | P1 |
| Loyalty points + wallet | MEDIUM | MEDIUM | P2 |
| Promo codes | MEDIUM | MEDIUM | P2 |
| Company analytics dashboard | MEDIUM | MEDIUM | P2 |
| Preferred washer selection | LOW | MEDIUM | P2 |
| Eco-friendly / verified badges | LOW | LOW | P2 |
| AI pricing | LOW | HIGH | P3 |
| Subscriptions | MEDIUM | HIGH | P3 |
| B2B fleet accounts | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for private beta launch
- P2: Add after core loop validated
- P3: v2+ only

---

## Competitor Feature Analysis

| Feature | Justlife (UAE) | Matic (Dubai) | ServiceMarket (UAE) | Washos/MobileWash (US) | Cleanly Approach |
|---------|---------------|--------------|--------------------|-----------------------|-----------------|
| Core model | Gig marketplace (platform employs via partners) | SaaS-enabled marketplace | Quote-based marketplace | Single-brand service | Company marketplace (customer picks company) |
| Real-time tracking | Yes | Yes | Not prominently | Yes | Yes — core feature |
| Carpet / sofa cleaning | Yes (AC cleaning, furniture) | Home cleaning focus | Yes, multiple categories | No (car wash only) | Yes — with distinct pickup-return model |
| Arabic / RTL | Yes | Yes | Yes | No | Yes — day 1 |
| WhatsApp notifications | Yes | Not confirmed | Not confirmed | No | Yes — 360dialog |
| Loyalty / rewards | Yes | Yes | Not confirmed | No | Yes — v1.x |
| Before/after photos | Not prominent | Not promoted | Not confirmed | Not prominent | Yes — differentiated quality signal |
| Company-facing analytics | Not public-facing | Not promoted | Not confirmed | N/A | Yes — v1.x |
| Stripe Connect payouts | Unclear (proprietary) | Unclear | Unclear | N/A | Yes — transparent commission model |
| Multi-category (3+) | 30+ categories | Home cleaning focus | 10+ categories | 1 category | 3 focused categories |

**Key competitive observation:** Cleanly's focus on 3 specific categories (vs. 30+ in Justlife) is a deliberate quality signal. The carpet pickup-return model with explicit return date scheduling is not prominently featured by any identified UAE competitor — this is a genuine differentiation opportunity if executed well.

---

## Sources

- [Top 10 Car Wash Apps in 2025 — GMTA Software](https://www.gmtasoftware.com/blog/top-10-car-wash-apps/)
- [On-Demand Car Wash App Features — On-Demand App](https://on-demand-app.com/blog/how-to-develop-on-demand-car-wash-app-like-washos/)
- [Best Cleaning Apps in Dubai: Justlife, MATIC & More — Property Finder](https://www.propertyfinder.ae/blog/cleaning-app-dubai/)
- [Justlife App Features — DXB Apps](https://dxbapps.com/blog/justlife-app)
- [Matic Dubai 150K monthly bookings — MENAbytes](https://www.menabytes.com/matic-150k-bookings/)
- [ServiceMarket UAE App — Apple App Store](https://apps.apple.com/us/app/servicemarket/id1146756698)
- [CleanCloud Pickup and Delivery — CleanCloud](https://cleancloudapp.com/pickup-and-delivery)
- [Carpet Cleaning Software — Jobber](https://www.getjobber.com/industries/carpet-cleaning-software/)
- [Rinse Laundry App — Rinse](https://www.rinse.com/app-for-laundry/)
- [Stripe Connect for Marketplaces — Stripe](https://stripe.com/connect/marketplaces)
- [UAE On-Demand Home Services Market Report 2022-2026 — Globe Newswire](https://www.globenewswire.com/news-release/2022/09/16/2517443/0/en/UAE-On-Demand-Home-Services-Market-Report-2022-2026-Featuring-Justlife-Urban-Company-ServiceMarket-Rizek-Mr-Usta-Hitches-and-Glitches-MPlus-Elite-Maids-Helpsters-Cleaning-Services.html)
- [Services Marketplace Features Checklist 2026 — Rigby](https://www.rigbyjs.com/blog/services-marketplace-features)
- [Sendbird Multi-Channel Messaging Guide](https://sendbird.com/developer/tutorials/customer-messaging-step-by-step-guide-sms-in-app-whatsapp)

---

*Feature research for: Cleanly — Gulf region on-demand cleaning marketplace*
*Researched: 2026-03-31*
