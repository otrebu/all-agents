---
depends:
  - "@context/blocks/observe/sentry.md"
  - "@context/blocks/construct/react.md"
---

# Sentry React Integration

@context/blocks/observe/sentry.md

React-specific error handling: ErrorBoundary, React 19 hooks, TanStack Router, Vite source maps.

## Install

```bash
install @sentry/react
```

## Setup with React

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, // Lower in prod
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

## Error Boundary

```tsx
import * as Sentry from "@sentry/react";

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error }) => <ErrorFallback error={error} />}
      beforeCapture={(scope) => {
        scope.setTag("location", "app-root");
      }}
    >
      <Router />
    </Sentry.ErrorBoundary>
  );
}
```

Nested boundaries for granular error handling:

```tsx
<Sentry.ErrorBoundary fallback={<DashboardError />}>
  <Dashboard />
</Sentry.ErrorBoundary>
```

## React 19 Error Hooks

```tsx
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";

const root = createRoot(container, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});
```

## TanStack Router Integration

```typescript
import { createRouter } from "@tanstack/react-router";

const router = createRouter({ routeTree });

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  tracesSampleRate: 1.0,
});
```

Requires `@tanstack/react-router` >= 1.64.0

## Vite Source Maps

```bash
install -D @sentry/vite-plugin
```

```typescript
// vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: { sourcemap: true },
  plugins: [
    sentryVitePlugin({
      org: "my-org",
      project: "my-project",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

## Environment Variables

```env
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

## When to Use

| Scenario                  | Sentry | Alternative |
| ------------------------- | ------ | ----------- |
| Production error tracking | Yes    | -           |
| Session replay            | Yes    | LogRocket   |
| Performance monitoring    | Yes    | -           |
| Dev-only debugging        | No     | Console     |
