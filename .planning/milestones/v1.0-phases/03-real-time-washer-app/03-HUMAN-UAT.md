---
status: partial
phase: 03-real-time-washer-app
source: [03-VERIFICATION.md]
started: 2026-04-05T05:00:00Z
updated: 2026-04-05T05:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Android background GPS with battery saver enabled (WASH-04)
expected: GPS continues broadcasting when washer app is backgrounded on a real Samsung device with battery saver enabled; foreground service notification remains in system tray; location events arrive on customer tracking map at 5-10 second intervals
result: [pending]

### 2. CountdownRing arc animation in washer job alert
expected: SVG arc renders gold and smoothly decrements from 30 to 0; arc transitions to warning orange at <10 seconds; center text updates every second
result: [pending]

### 3. Map fitToCoordinates behavior in tracking screen
expected: Map auto-fits to show both washer and customer pins on first location update with correct padding; does not thrash on subsequent location updates
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
