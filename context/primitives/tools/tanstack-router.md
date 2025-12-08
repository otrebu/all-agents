---
depends: []
---

# TanStack Router

Type-safe routing for React applications.

## Setup

```bash
pnpm add @tanstack/react-router
```

## Route Definition

```typescript
import { createRouter, createRoute, createRootRoute } from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$userId",
  component: UserDetail,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, userRoute]),
});
```

## Route Params

```typescript
// In component
import { useParams } from "@tanstack/react-router";

const { userId } = useParams({ from: "/users/$userId" });
```
