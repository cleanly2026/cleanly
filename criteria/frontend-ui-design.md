# Frontend / UI Design Criteria — Cleanly Platform

> Evaluator type: AI agent (gsd-evaluator) | Scoring: 1-10 per dimension
> Weighting: Design Quality and Originality weighted **2x**, RTL/i18n Quality weighted **1.5x**, rest **1x**.

**Evaluator instructions:** Be skeptical — do not default to praising the work. Every score must cite specific evidence from the live UI via Playwright interaction. If you are unsure whether something meets a threshold, score it lower and explain why.

## Context

Cleanly is a bilingual (Arabic RTL + English LTR) cleaning services marketplace for the Gulf region. It has 5 app surfaces: customer-web (Next.js), company-web (Vite SPA), admin-web (Next.js), customer-mobile (Expo), washer-mobile (Expo). The evaluator tests web surfaces via Playwright. All surfaces share `packages/ui` components and `packages/i18n` strings.

## Dimensions

### 1. Design Quality (Weight: 2x)

Does the design feel like a coherent whole? Colors, typography, layout, and imagery should combine to establish a distinct mood and visual identity — not just "clean" or "modern" but something with a clear point of view. For a marketplace, the design must convey trust, professionalism, and accessibility to Gulf-region users.

| Score | Description |
|-------|-------------|
| 9-10  | Striking, cohesive visual identity. Every element reinforces a clear design direction. Could pass as a professionally designed product. Gulf-region users would trust this with payment. |
| 7-8   | Strong visual identity with minor inconsistencies. The overall direction is clear and intentional. |
| 5-6   | Competent but generic. Looks like a well-executed template without a distinct personality. |
| 3-4   | Inconsistent — some elements feel considered, others feel like defaults. No unified direction. |
| 1-2   | Visually incoherent. Clashing styles, no discernible design intent. |

### 2. Originality (Weight: 2x)

Evidence of custom decisions rather than template layouts or library defaults. Penalize telltale signs of AI generation and "AI slop": purple gradients over white cards, generic hero sections with stock copy, cookie-cutter card grids, glassmorphism/frosted-glass defaults, overly symmetrical layouts with no visual tension, gradient-heavy CTAs, and placeholder-quality microcopy ("Welcome to [App]", "Get started today").

For a marketplace: look for custom service cards, thoughtful booking flow design, distinctive company profiles, and real-world service context (not generic SaaS patterns).

| Score | Description |
|-------|-------------|
| 9-10  | Genuinely distinctive. Layout, color choices, and interactions feel custom. Service context is reflected in design decisions. |
| 7-8   | Mostly original with a few conventional fallbacks. Clear creative intent throughout. |
| 5-6   | Some custom touches but largely follows common patterns. Would blend in among similar apps. |
| 3-4   | Template-driven. Standard card grid, default component library styling, predictable layout. |
| 1-2   | Pure defaults. Indistinguishable from a scaffolded starter project. |

### 3. Craft (Weight: 1x)

Technical execution of visual design: typography hierarchy, spacing consistency, color harmony, contrast ratios, alignment, responsive behavior. Includes RTL-specific craft: logical properties used correctly, no hardcoded directional values, Cairo/Tajawal font rendering quality.

| Score | Description |
|-------|-------------|
| 9-10  | Pixel-perfect execution. Flawless type scale, consistent spacing system, perfect alignment in both LTR and RTL. |
| 7-8   | Minor imperfections that don't disrupt the experience. Solid attention to detail. |
| 5-6   | Adequate. No glaring issues but inconsistencies noticeable on close inspection. |
| 3-4   | Sloppy spacing, inconsistent type sizes, misaligned elements. Feels unfinished. |
| 1-2   | No attention to detail. Broken layouts, overlapping elements, unreadable text. |

### 4. Functionality (Weight: 1x)

Usability independent of aesthetics. Can a user understand the interface, locate primary actions, and complete tasks intuitively?

| Score | Description |
|-------|-------------|
| 9-10  | Instantly intuitive. Clear information hierarchy, obvious CTAs, zero confusion. |
| 7-8   | Easy to use with minimal friction. One or two areas could be clearer. |
| 5-6   | Usable but requires some guessing. Important actions aren't immediately obvious. |
| 3-4   | Confusing navigation or layout. Users would struggle to complete basic tasks. |
| 1-2   | Unusable. Critical actions hidden, misleading affordances, broken interaction flows. |

### 5. RTL / i18n Quality (Weight: 1.5x)

Arabic RTL rendering correctness, bilingual content handling, and internationalization quality. This is a day-1 requirement for Cleanly — not a nice-to-have.

| Score | Description |
|-------|-------------|
| 9-10  | Flawless RTL. Layout mirrors correctly, logical properties throughout, Cairo font renders beautifully, no LTR artifacts in Arabic mode. Language toggle instant and complete. |
| 7-8   | Strong RTL with minor issues. A few elements don't mirror (icons, specific layouts) but text and flow are correct. |
| 5-6   | Basic RTL works but has visible issues. Some hardcoded directional values, text alignment problems, mixed LTR/RTL elements. |
| 3-4   | RTL is broken in significant ways. Layout doesn't mirror, text overlaps, direction-sensitive UI elements point wrong way. |
| 1-2   | No functional RTL. Arabic text renders but layout is entirely LTR. Unusable for Arabic users. |

### 6. Multi-Surface Consistency (Weight: 1x)

Are shared design tokens, components, and patterns consistent across the web surfaces tested? Does `packages/ui` actually provide the shared components? Do customer-web, company-web, and admin-web feel like parts of the same product family?

| Score | Description |
|-------|-------------|
| 9-10  | All surfaces share clear design DNA. Colors, typography, spacing, and component patterns are consistent. Each surface has appropriate role-specific variations while maintaining family cohesion. |
| 7-8   | Mostly consistent with minor drift. Shared components used but occasional one-off styling. |
| 5-6   | Some consistency but surfaces feel like different projects. Shared package underutilized. |
| 3-4   | Surfaces visually disconnected. Different color schemes, typography, or component patterns. |
| 1-2   | No consistency. Each surface looks like a different product. |

## Scoring Formula

```
Weighted Score = ((Design Quality * 2) + (Originality * 2) + Craft + Functionality + (RTL Quality * 1.5) + Multi-Surface) / 8.5
```

## Hard Threshold

Any single dimension scoring **3 or below** triggers a fail regardless of the weighted score. RTL/i18n Quality scoring **3 or below** also triggers a fail — Arabic support is a core product requirement, not optional polish.
