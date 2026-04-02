# Phase 2: Core Business Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 02-core-business-flow
**Areas discussed:** Discovery UX, Booking Flow, Payment Experience, Company Dashboard

---

## Discovery UX

### Category Selection
| Option | Description | Selected |
|--------|-------------|----------|
| Big visual cards | 3 large tappable cards with icons for each service type. Careem/Talabat style. | ✓ |
| Icon tabs at top | Horizontal icon strip, content changes below. Faster switching, less impact. | |
| You decide | Claude picks based on platform style | |

**User's choice:** Big visual cards (Recommended)
**Notes:** None

### Company Listing Cards
| Option | Description | Selected |
|--------|-------------|----------|
| Rich cards | Logo, name, rating, review count, price, response time. One per row. | ✓ |
| Compact list | Name, rating, price only. More companies visible. | |
| You decide | Claude picks density | |

**User's choice:** Rich cards (Recommended)
**Notes:** None

### GPS Fallback
| Option | Description | Selected |
|--------|-------------|----------|
| City picker dropdown | Modal/sheet with available cities list. | ✓ |
| Search-first | Search bar for city name. More flexible, more friction. | |
| You decide | Claude picks fallback UX | |

**User's choice:** City picker dropdown (Recommended)
**Notes:** None

### Company Profile Reviews
| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable sections | Single page: header → packages → add-ons → reviews. No tabs. | ✓ |
| Tabbed layout | Tabs for Packages, Reviews, Info. Cleaner separation. | |
| You decide | Claude picks layout | |

**User's choice:** Scrollable sections (Recommended)
**Notes:** None

---

## Booking Flow

### Flow Structure
| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable page | All steps on one page with sticky total bar. | ✓ |
| Multi-step wizard | Step-by-step with progress indicator. | |
| You decide | Claude picks structure | |

**User's choice:** Single scrollable page (Recommended)
**Notes:** None

### Location Pin (On-Site)
| Option | Description | Selected |
|--------|-------------|----------|
| Draggable map pin | Full-screen map, centered pin, reverse geocoding. Parking notes field. | ✓ |
| Address search + map confirm | Type address first, confirm on map. | |
| You decide | Claude picks location UX | |

**User's choice:** Draggable map pin (Recommended)
**Notes:** None

### Carpet Pickup Slots
| Option | Description | Selected |
|--------|-------------|----------|
| Date + time slot grid | Calendar picker + 2-hour slots. Company defines availability. | ✓ |
| Simple date + AM/PM | Date + morning/afternoon only. | |
| You decide | Claude picks slot UX | |

**User's choice:** Date + time slot grid (Recommended)
**Notes:** None

### Add-On Presentation
| Option | Description | Selected |
|--------|-------------|----------|
| Toggleable chips/cards | Card per add-on with name, price, toggle. Running total updates. | ✓ |
| Checkbox list | Simple checkboxes. Functional, less visual. | |
| You decide | Claude picks UI | |

**User's choice:** Toggleable chips/cards (Recommended)
**Notes:** None

---

## Payment Experience

### Payment UI
| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Payment Element | Pre-built component. Card + Apple Pay + Google Pay. Minimal PCI. | ✓ |
| Custom card form + wallet buttons | Build own inputs. More control, more work, more PCI scope. | |
| You decide | Claude picks approach | |

**User's choice:** Stripe Payment Element (Recommended)
**Notes:** None

### Platform Fee Visibility
| Option | Description | Selected |
|--------|-------------|----------|
| Show as 'service fee' line item | Transparent: subtotal + service fee + total. | ✓ |
| Hide fee in total | Baked into total. Cleaner but less transparent. | |
| You decide | Claude picks display | |

**User's choice:** Show as 'service fee' line item (Recommended)
**Notes:** None

### Payment Failure
| Option | Description | Selected |
|--------|-------------|----------|
| Inline error + retry | Error on same screen, retry without losing booking. | ✓ |
| Redirect to error page | Separate error page with 'try again'. | |
| You decide | Claude picks failure UX | |

**User's choice:** Inline error + retry (Recommended)
**Notes:** None

### Wallet Scope
| Option | Description | Selected |
|--------|-------------|----------|
| Defer wallet to later | Phase 2 = direct Stripe only. Wallet adds complexity. | ✓ |
| Include basic wallet | Simple top-up + wallet-only payments. | |
| You decide | Claude picks scope | |

**User's choice:** Defer wallet to later (Recommended)
**Notes:** PAY-02 deferred from Phase 2.

---

## Company Dashboard

### Order Feed Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Table with status filters | Data table + filter tabs (All/Pending/Active/Completed). Real-time updates. | ✓ |
| Kanban board | Status columns, drag cards. Visual but complex. | |
| You decide | Claude picks layout | |

**User's choice:** Table with status filters (Recommended)
**Notes:** None

### Washer Assignment
| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown on order row | Click Assign, dropdown shows washers, select and confirm. | ✓ |
| Drag-and-drop | Washer sidebar, drag onto order. More visual, complex. | |
| You decide | Claude picks UX | |

**User's choice:** Dropdown on order row (Recommended)
**Notes:** None

### Company Onboarding Scope
| Option | Description | Selected |
|--------|-------------|----------|
| Full profile + packages + Stripe Connect | Everything for self-serve. | ✓ |
| Minimal — profile only, seed packages | Faster build, no self-serve. | |
| You decide | Claude picks scope | |

**User's choice:** Full profile + packages + Stripe Connect (Recommended)
**Notes:** None

### Company-Web i18n
| Option | Description | Selected |
|--------|-------------|----------|
| Yes, wire i18next now | Set up from day 1, all pages use keys. | ✓ |
| Defer to Phase 4 | English only, retrofit later. | |
| You decide | Claude picks timing | |

**User's choice:** Yes, wire i18next now (Recommended)
**Notes:** None

---

## Claude's Discretion

- TanStack Query setup pattern
- API route organization
- Stripe webhook verification details
- Map library choice
- Company-web routing structure
- Socket.io room design for real-time dashboard
- Order timeout/cancellation policy details
- Stripe Connect onboarding flow type

## Deferred Ideas

- Wallet top-up (PAY-02) — deferred from Phase 2, direct Stripe only
- Loyalty/promo codes — already in v2 requirements, not Phase 2
