---
depends:
  - "@context/blocks/observe/web-vitals.md"
  - "@context/blocks/observe/sentry.md"
---

# Web Vitals to Sentry

@context/blocks/observe/web-vitals.md

Send Core Web Vitals to Sentry for correlation with errors and traces.

## Integration

```typescript
import * as Sentry from "@sentry/react";
import { onLCP, onINP, onCLS, Metric } from "web-vitals";

function sendToSentry(metric: Metric) {
  Sentry.captureMessage(`Web Vital: ${metric.name}`, {
    level: metric.rating === "poor" ? "warning" : "info",
    tags: { webVital: metric.name, rating: metric.rating },
    extra: { value: metric.value, delta: metric.delta },
  });
}

onLCP(sendToSentry);
onINP(sendToSentry);
onCLS(sendToSentry);
```

> **Note:** Sentry's `browserTracingIntegration` already captures some performance metrics. Use this for explicit Core Web Vitals tracking with ratings.

## Production Sample Rate

```typescript
function sendToSentry(metric: Metric) {
  if (Math.random() > 0.1) return; // 10% sample
  Sentry.captureMessage(`Web Vital: ${metric.name}`, {
    level: metric.rating === "poor" ? "warning" : "info",
    tags: { webVital: metric.name, rating: metric.rating },
    extra: { value: metric.value, delta: metric.delta },
  });
}
```
