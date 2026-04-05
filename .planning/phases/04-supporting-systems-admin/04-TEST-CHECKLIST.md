# Phase 04: Manual Test Checklist

**Purpose:** Human-walkthrough checklist for private beta verification of Phase 4 features.
**Prerequisites:** Run `cd packages/db && npx tsx seed.ts` to populate test data. Start API, admin-web, and customer-web dev servers.

## Admin Panel Tests

### 1. Dashboard (ADM-02)
- [ ] Visit http://localhost:3002/en
- [ ] Sidebar shows 6 sections: Dashboard, Companies, Orders, Disputes, Cities, Audit Log
- [ ] 4 stat cards visible (total orders, revenue, active companies, open disputes)
- [ ] Recent orders table loads with seed data

### 2. Company Review (ADM-01)
- [ ] Navigate to Companies page
- [ ] Filter to "Pending" — Sharjah Clean Co appears
- [ ] Click Sharjah Clean Co — detail view loads
- [ ] Click Approve — status changes to verified
- [ ] Click Reject on another test — rejection reason modal appears
- [ ] Rejected company receives notification (check API logs for notification queue job)

### 3. Orders List (ADM-02)
- [ ] Navigate to Orders page — all 5 seed orders visible
- [ ] Click an order — full detail panel shows items, status, customer, washer
- [ ] Status filters work (completed, pending, en_route, in_cleaning)

### 4. Disputes & Refunds (ADM-04, ADM-05)
- [ ] Navigate to Disputes page — 1 open dispute visible
- [ ] Click dispute — before/after photos load (or placeholder if no photos in seed)
- [ ] Click "Issue Refund" — refund modal appears with amount field
- [ ] Submit partial refund — confirm Stripe refund fires (check API logs)

### 5. Cities CRUD (ADM-03)
- [ ] Navigate to Cities page — 3 cities (Dubai, Abu Dhabi, Sharjah) visible
- [ ] Click "Add City" — fill name_en, name_ar, country — submit succeeds
- [ ] Delete a city — confirm removal

### 6. Audit Log (ADM-06)
- [ ] Navigate to Audit Log page — at least 2 seed entries visible
- [ ] Filter by action type — filters work
- [ ] Each entry shows admin, action, entity, timestamp

## Customer-Facing Tests

### 7. Customer Dispute Flow (ADM-04, NOTF-01)
- [ ] Visit completed order page as customer
- [ ] Tap "Report an Issue" button
- [ ] Select reason, add note, submit
- [ ] Dispute created — visible in admin Disputes page

## Cross-Cutting Tests

### 8. RTL Layout
- [ ] Switch to /ar locale on admin panel
- [ ] Sidebar moves to right side
- [ ] Text alignment is RTL throughout
- [ ] Tables and data display correctly in RTL

### 9. Error Boundaries
- [ ] Stop API server
- [ ] Reload admin panel — error boundary shows "Something went wrong" with Refresh button
- [ ] Reload customer web — error boundary shows with Try Again button
- [ ] Restart API — Refresh/Try Again recovers

## Booking Flow (End-to-End Smoke Test)

### 10. Full Booking Flow
- [ ] Customer searches for car wash in Dubai
- [ ] Selects Sparkle Auto Care
- [ ] Chooses Basic Wash package
- [ ] Proceeds to payment (Stripe test mode)
- [ ] Order confirmed — notification dispatched (check API logs)
- [ ] Admin sees new order in Orders page
