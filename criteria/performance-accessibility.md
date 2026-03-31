# Performance & Accessibility Criteria — Cleanly Platform

> Evaluator type: AI agent (gsd-evaluator) | Scoring: 1-10 per dimension
> Weighting: All dimensions weighted equally (1x).

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific evidence (measured load times, DOM inspection, viewport testing, RTL screen reader behavior). If you are unsure whether something meets a threshold, score it lower and explain why.

## Context

Cleanly serves Gulf-region users (UAE, KSA, Egypt) on varying network conditions and devices. Customer-web needs SSR for SEO. Company-web is a Vite SPA (no SSR needed). All web surfaces must work in both LTR (English) and RTL (Arabic) layouts. Mobile connections in the region can be inconsistent — performance matters.

## Dimensions

### 1. Load Performance (Weight: 1x)

How fast does the application load and become interactive? Considers bundle size, code splitting, image optimization, SSR/streaming (customer-web), and initial paint times.

| Score | Description |
|-------|-------------|
| 9-10  | Near-instant. Customer-web uses SSR/streaming for fast first paint. Code splitting per route. Images optimized via Next.js Image or sharp. Company-web Vite bundle is lean. Shared packages tree-shake correctly. |
| 7-8   | Fast. Minor optimization opportunities remain but nothing noticeable to users. |
| 5-6   | Acceptable. Loads in a few seconds. Missing some obvious optimizations (uncompressed images, no code splitting, entire packages/ui bundled when only one component used). |
| 3-4   | Slow. Noticeable delays, large unoptimized bundles, no lazy loading. Gulf users on 3G would wait 5+ seconds. |
| 1-2   | Painfully slow. Multi-second blank screens, massive bundles, render-blocking everything. |

### 2. Runtime Performance (Weight: 1x)

Is the app responsive during use? Smooth scrolling, fast interactions, no jank, efficient re-renders, no memory leaks during extended use. Map interactions and real-time order tracking must be smooth.

| Score | Description |
|-------|-------------|
| 9-10  | Buttery smooth. 60fps interactions, efficient TanStack Query caching, Socket.io updates don't cause layout thrashing. Map panning is smooth. |
| 7-8   | Smooth with occasional minor hiccups under stress. No issues in normal use. |
| 5-6   | Noticeable lag in some interactions. Unnecessary re-renders from Socket.io updates or TanStack Query refetches. |
| 3-4   | Janky. Dropped frames during map interaction, sluggish form inputs, UI freezes during data fetches. |
| 1-2   | Unusable. Constant freezing, memory leaks, crashes under normal load. |

### 3. Semantic HTML & Screen Readers (Weight: 1x)

Proper use of semantic elements, ARIA attributes where needed, logical heading hierarchy, meaningful alt text, keyboard-navigable interactive elements. Includes RTL-specific semantics.

| Score | Description |
|-------|-------------|
| 9-10  | Fully accessible. Semantic markup throughout, correct ARIA usage, `lang` attribute set correctly per language, `dir="rtl"` applied at root level. Logical tab order in both directions. Form labels associated correctly. Screen reader announces content in correct language. |
| 7-8   | Good accessibility. Minor gaps (missing alt text, occasional div-as-button) but largely navigable with assistive tech in both languages. |
| 5-6   | Basic semantics in place. Some ARIA, some semantic elements, but screen reader experience in Arabic would be rough. `dir` attribute present but not consistently applied. |
| 3-4   | Poor. Div soup, no ARIA, images without alt text, custom controls without keyboard support. RTL semantics completely absent. |
| 1-2   | Inaccessible. Completely unusable with assistive technology. |

### 4. Responsive Design (Weight: 1x)

Does the interface work across viewport sizes? Proper breakpoints, no horizontal overflow, touch targets sized correctly on mobile viewports, images scale appropriately. Test at: 375px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide).

| Score | Description |
|-------|-------------|
| 9-10  | Flawless across all viewports. Thoughtful layout shifts, appropriate touch targets (48px minimum), no content loss at any size. Booking flow usable on mobile. |
| 7-8   | Works well on major breakpoints. Minor issues at uncommon sizes. |
| 5-6   | Desktop-first with basic mobile support. Some elements overflow or become cramped on 375px. Booking flow requires horizontal scrolling on mobile. |
| 3-4   | Broken on mobile. Overlapping elements, unreadable text, horizontal scrolling on primary flows. |
| 1-2   | Single viewport only. Completely unusable outside the designed screen size. |

### 5. RTL Accessibility (Weight: 1x)

Screen reader behavior, focus order, and interaction patterns in RTL mode. This goes beyond visual RTL layout to test actual assistive technology compatibility in Arabic.

| Score | Description |
|-------|-------------|
| 9-10  | Full RTL accessibility. Focus order follows right-to-left reading direction. `lang="ar"` causes screen reader to switch voice. Form validation errors announced in Arabic. Skip-to-content link works in RTL. Dialog focus trap respects RTL tab order. |
| 7-8   | Good RTL accessibility. Focus order mostly correct, minor issues with complex widgets (date pickers, map controls). |
| 5-6   | Basic. `dir="rtl"` applied but focus order still follows LTR pattern. Screen reader language not set per-element for mixed-language content. |
| 3-4   | Broken. Focus order is LTR in Arabic mode. Screen reader announces English when Arabic content displayed. Interactive elements unreachable via keyboard in RTL. |
| 1-2   | No RTL accessibility. Completely unusable for Arabic screen reader users. |

## Scoring Formula

```
Weighted Score = (Load Performance + Runtime Performance + Semantic HTML + Responsive Design + RTL Accessibility) / 5
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail. Semantic HTML scoring **4 or below** also triggers a fail — accessibility is a baseline requirement, not polish.
