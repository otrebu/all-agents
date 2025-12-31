---
depends:
  - "@context/blocks/construct/react.md"
  - "@context/blocks/construct/tanstack-router.md"
---

# Code Splitting: Route-Level Lazy Loading

Split bundles by route to reduce initial bundle size. Load pages on-demand.

## When to Consider Lazy Loading

| Split | Don't Split |
|-------|-------------|
| Route-level pages | Small components (<5KB) |
| Admin-only sections | Critical path / above-fold |
| Rarely visited pages | Frequently accessed routes |
| Heavy feature pages | Auth entry points |

**Rule:** If user doesn't see it on first load, don't block initial render.

## React.lazy Basics

```tsx
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

## Route-Based Splitting (TanStack Router)

TanStack Router has built-in lazy loading via `.lazy.tsx` files.

### Lazy Route Files

```typescript
// routes/dashboard.lazy.tsx
import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return <div>Dashboard content</div>;
}
```

### Manual Lazy Routes

```typescript
// routes/settings.tsx
import { createFileRoute, lazy } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: lazy(() => import("../components/Settings")),
});
```

### Loader + Lazy Component

Split data loading from component loading:

```typescript
// routes/user.$id.tsx - loads immediately
export const Route = createFileRoute("/user/$id")({
  loader: ({ params }) => fetchUser(params.id),
});

// routes/user.$id.lazy.tsx - loads with route
export const Route = createLazyFileRoute("/user/$id")({
  component: UserProfile,
});
```

## Measuring Impact

Analyze bundle with visualizer:

```bash
# After build, check dist/stats.html
build
```

Target: Initial JS < 200KB (gzipped)
