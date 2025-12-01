# TanStack (Query + Router)

Async data management and type-safe routing.

## Setup

```bash
pnpm add @tanstack/react-query @tanstack/react-router
```

## Query - Data Fetching

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch
const { data, isLoading, error } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});

// With params
const { data } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
  enabled: !!userId,
});

// Mutation
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
});
```

## Query Provider

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

## Router - Type-safe Routes

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
