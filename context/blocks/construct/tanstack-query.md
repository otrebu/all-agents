---
depends: []
---

# TanStack Query

Async data management and server state handling.

## Setup

```bash
pnpm add @tanstack/react-query
```

## Data Fetching

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

## Provider

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```
