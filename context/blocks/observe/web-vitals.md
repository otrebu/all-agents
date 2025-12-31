---
depends: []
---

# Web Vitals

Measure Core Web Vitals: LCP, INP, CLS. Google's ranking signals for user experience.

## Install

```bash
pnpm add web-vitals
```

## Core Metrics

| Metric  | Measures         | Good    | Needs Improvement | Poor    |
| ------- | ---------------- | ------- | ----------------- | ------- |
| **LCP** | Loading          | < 2.5s  | 2.5s - 4s         | > 4s    |
| **INP** | Interactivity    | < 200ms | 200ms - 500ms     | > 500ms |
| **CLS** | Visual stability | < 0.1   | 0.1 - 0.25        | > 0.25  |

- **LCP** (Largest Contentful Paint): Time to render largest visible element
- **INP** (Interaction to Next Paint): Response time to user interactions
- **CLS** (Cumulative Layout Shift): Unexpected layout movements

## Basic Usage

```typescript
import { onLCP, onINP, onCLS } from "web-vitals";

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

> **Important:** Call each function only once per page load to avoid memory leaks.

## Metric Object

```typescript
interface Metric {
  name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number; // Change since last report
  id: string; // Unique per page load
}
```

## Attribution (Debugging)

```typescript
import { onLCP, onINP, onCLS } from "web-vitals/attribution";

onLCP((metric) => {
  console.log("LCP element:", metric.attribution.element);
  console.log("LCP resource:", metric.attribution.url);
});

onINP((metric) => {
  console.log("INP target:", metric.attribution.interactionTarget);
  console.log("INP type:", metric.attribution.interactionType);
});

onCLS((metric) => {
  console.log("CLS sources:", metric.attribution.largestShiftSources);
});
```

## Optimization Tips

### LCP (Loading)

- Preload critical images: `<link rel="preload" as="image">`
- Use `fetchpriority="high"` on hero images
- Avoid lazy-loading above-fold images
- Optimize server response time (TTFB)

### INP (Interactivity)

- Break long tasks (> 50ms) with `setTimeout` or `scheduler.yield()`
- Use React 18 `startTransition` for non-urgent updates
- Debounce expensive handlers
- Avoid layout thrashing in event handlers

### CLS (Stability)

- Set explicit `width`/`height` on images
- Reserve space for dynamic content (ads, embeds)
- Avoid inserting content above existing content
- Use CSS `contain` for isolated components

## When Metrics Report

- **CLS/INP**: On visibility change (page hide)
- **LCP**: When page becomes hidden or interaction occurs
- **FCP/TTFB**: Once available

## When to Use

| Scenario              | web-vitals | Alternative |
| --------------------- | ---------- | ----------- |
| RUM metrics           | Yes        | -           |
| Performance debugging | Yes        | DevTools    |
| Analytics integration | Yes        | -           |
| Synthetic testing     | No         | Lighthouse  |

web-vitals = real user monitoring, Core Web Vitals compliance, SEO ranking signals.
