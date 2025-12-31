---
depends: []
---

# Sentry

Error tracking and performance monitoring. Capture exceptions, breadcrumbs, user context.

## Install

```bash
pnpm add @sentry/browser
```

## Basic Setup

```typescript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
  environment: "production",
  tracesSampleRate: 1.0, // 100% in dev, lower in prod
});
```

## Capture Exceptions

```typescript
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: "checkout" },
    extra: { orderId: "123" },
  });
}
```

## Capture Messages

```typescript
Sentry.captureMessage("User completed onboarding", "info");
```

## User Context

```typescript
// Set user on login
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Clear on logout
Sentry.setUser(null);
```

## Breadcrumbs

Auto-captured: console, DOM clicks, fetch, navigation.

Manual breadcrumbs:

```typescript
Sentry.addBreadcrumb({
  category: "auth",
  message: "User logged in",
  level: "info",
  data: { method: "oauth" },
});
```

## Performance Spans

```typescript
const span = Sentry.startInactiveSpan({
  name: "checkout-flow",
  op: "user-action",
});

// ... do work

span?.end();
```

## Tags and Context

```typescript
// Tags: indexed, searchable
Sentry.setTag("feature", "checkout");

// Context: not indexed, for debugging
Sentry.setContext("order", {
  id: "123",
  items: ["a", "b"],
});
```

## When to Use

| Scenario                   | Sentry    | Alternative |
| -------------------------- | --------- | ----------- |
| Production error tracking  | Yes       | -           |
| Performance monitoring     | Yes       | -           |
| Dev-only debugging         | No        | Console     |

Sentry = production error tracking, user context, performance monitoring.

For framework integrations: see foundations/observe/errors-sentry-*.md
