# TanStack Query (React Query v5) - Comprehensive Reference

> Research compiled December 2024. TanStack Query v5 requires React 18.0 or later.

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [useQuery](#2-usequery)
3. [useMutation](#3-usemutation)
4. [Query Invalidation](#4-query-invalidation)
5. [Caching](#5-caching)
6. [Infinite Queries](#6-infinite-queries)
7. [Prefetching & SSR](#7-prefetching--ssr)
8. [DevTools](#8-devtools)
9. [Best Practices](#9-best-practices)

---

## 1. Core Concepts

TanStack Query (formerly React Query) is described as the missing data-fetching library for web applications, making fetching, caching, synchronizing, and updating server state seamless.

### The Three Core Concepts

1. **Queries** - For fetching data (GET operations)
2. **Mutations** - For creating/updating/deleting data
3. **Query Invalidation** - For marking cached data as stale

### Basic Setup

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 3,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 2,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  )
}
```

### Key v5 Changes from v4

- `loading` status renamed to `pending` (`isLoading` -> `isPending`)
- `cacheTime` renamed to `gcTime` (garbage collection time)
- `onSuccess`, `onError`, `onSettled` removed from `useQuery` (still available in mutations)
- `keepPreviousData` replaced with `placeholderData: keepPreviousData`
- Dedicated suspense hooks: `useSuspenseQuery`, `useSuspenseInfiniteQuery`
- ~20% smaller bundle size

---

## 2. useQuery

### Basic Usage

```tsx
import { useQuery } from '@tanstack/react-query'

function TodoList() {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  })

  if (isPending) return <span>Loading...</span>
  if (isError) return <span>Error: {error.message}</span>

  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

### Key Options

| Option | Type | Description |
|--------|------|-------------|
| `queryKey` | `unknown[]` | Unique key for the query (required) |
| `queryFn` | `() => Promise<TData>` | Function that fetches data (required) |
| `enabled` | `boolean` | Disable/enable query execution |
| `staleTime` | `number` | Time before data is considered stale (default: 0) |
| `gcTime` | `number` | Time before inactive queries are garbage collected (default: 5 min) |
| `refetchOnWindowFocus` | `boolean \| 'always'` | Refetch when window regains focus |
| `refetchOnMount` | `boolean \| 'always'` | Refetch when component mounts |
| `refetchOnReconnect` | `boolean \| 'always'` | Refetch when network reconnects |
| `refetchInterval` | `number \| false` | Polling interval in ms |
| `retry` | `number \| boolean` | Number of retry attempts (default: 3 client, 0 server) |
| `select` | `(data: TData) => TSelected` | Transform/select data |
| `placeholderData` | `TData \| (prev) => TData` | Placeholder while loading |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `data` | `TData \| undefined` | The query result |
| `error` | `TError \| null` | Error object if query failed |
| `status` | `'pending' \| 'error' \| 'success'` | Current status |
| `isPending` | `boolean` | True if no cached data and fetching |
| `isError` | `boolean` | True if query errored |
| `isSuccess` | `boolean` | True if query succeeded |
| `isFetching` | `boolean` | True if fetching (including background) |
| `isLoading` | `boolean` | Alias for `isPending && isFetching` |
| `isPlaceholderData` | `boolean` | True if showing placeholder data |
| `refetch` | `() => Promise` | Manual refetch function |

### Conditional Fetching with `enabled`

```tsx
function UserProfile({ userId }: { userId: string | null }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId!),
    enabled: !!userId, // Only fetch when userId exists
  })

  return <div>{data?.name}</div>
}
```

### Using `placeholderData`

```tsx
import { useQuery, keepPreviousData } from '@tanstack/react-query'

function PaginatedList({ page }: { page: number }) {
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['items', page],
    queryFn: () => fetchItems(page),
    placeholderData: keepPreviousData, // Keep previous page data while loading
  })

  return (
    <div style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
      {data?.items.map(item => <Item key={item.id} {...item} />)}
    </div>
  )
}
```

### Custom `placeholderData` Function

```tsx
const { data } = useQuery({
  queryKey: ['todo', todoId],
  queryFn: () => fetchTodo(todoId),
  placeholderData: (previousData, previousQuery) => {
    // Use previous todo as placeholder, or return undefined
    return previousData ?? { id: todoId, title: 'Loading...', completed: false }
  },
})
```

---

## 3. useMutation

### Basic Usage

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function AddTodo() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (newTodo: Todo) => axios.post('/todos', newTodo),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  return (
    <button
      onClick={() => mutation.mutate({ title: 'New Todo' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Adding...' : 'Add Todo'}
    </button>
  )
}
```

### Mutation States

| State | Description |
|-------|-------------|
| `isIdle` | Mutation hasn't been called yet |
| `isPending` | Mutation is currently executing |
| `isError` | Mutation encountered an error |
| `isSuccess` | Mutation completed successfully |

### Callback Options

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Called before mutation executes
    // Perfect for optimistic updates
    return { previousTodo } // Context for rollback
  },
  onSuccess: (data, variables, context) => {
    // Called when mutation succeeds
    console.log('Updated:', data)
  },
  onError: (error, variables, context) => {
    // Called when mutation fails
    // Can use context for rollback
  },
  onSettled: (data, error, variables, context) => {
    // Called on both success and error
    // Great for cleanup/invalidation
  },
})
```

### Optimistic Updates - Method 1: Via Variables

Simpler approach without cache manipulation:

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const mutation = useMutation({
    mutationFn: (newTitle: string) =>
      axios.patch(`/todos/${todo.id}`, { title: newTitle }),
  })

  return (
    <div>
      {/* Show optimistic value while pending */}
      <span>{mutation.isPending ? mutation.variables : todo.title}</span>
      <button onClick={() => mutation.mutate('Updated Title')}>
        Update
      </button>
    </div>
  )
}
```

### Optimistic Updates - Method 2: Cache Manipulation

For updates visible across multiple components:

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos', newTodo.id] })

    // Snapshot the previous value
    const previousTodo = queryClient.getQueryData(['todos', newTodo.id])

    // Optimistically update the cache
    queryClient.setQueryData(['todos', newTodo.id], newTodo)

    // Return context with snapshot
    return { previousTodo }
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos', newTodo.id], context?.previousTodo)
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

### Mutation Scope (Serial Execution)

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  scope: {
    id: 'todo-updates', // All mutations with same scope run serially
  },
})
```

### useMutationState

Access mutation state from any component:

```tsx
import { useMutationState } from '@tanstack/react-query'

function PendingTodos() {
  const pendingTodos = useMutationState({
    filters: { mutationKey: ['addTodo'], status: 'pending' },
    select: (mutation) => mutation.state.variables,
  })

  return (
    <ul>
      {pendingTodos.map((todo, i) => (
        <li key={i} style={{ opacity: 0.5 }}>{todo?.title}</li>
      ))}
    </ul>
  )
}
```

---

## 4. Query Invalidation

### Basic Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query'

function UpdateButton() {
  const queryClient = useQueryClient()

  return (
    <button onClick={() => {
      // Invalidate every query with 'todos' in the key
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }}>
      Refresh Todos
    </button>
  )
}
```

### Invalidation Behavior

When a query is invalidated:

1. It's marked as **stale** (overrides `staleTime`)
2. Active queries are **refetched in background** (by default)
3. Inactive queries will refetch when next used

### Query Matching Patterns

```tsx
// Invalidate all queries
queryClient.invalidateQueries()

// Invalidate all queries starting with 'todos'
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Invalidate exact match only
queryClient.invalidateQueries({
  queryKey: ['todos', { status: 'done' }],
  exact: true
})

// Invalidate with predicate function
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' &&
    query.queryKey[1]?.status === 'active'
})
```

### Refetch Type Options

```tsx
// Default: refetch active queries only
queryClient.invalidateQueries({ queryKey: ['todos'] })

// Don't refetch, just mark as stale
queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'none'
})

// Refetch both active and inactive queries
queryClient.invalidateQueries({
  queryKey: ['todos'],
  refetchType: 'all'
})
```

### invalidateQueries vs refetchQueries vs removeQueries

| Method | Behavior |
|--------|----------|
| `invalidateQueries` | Marks as stale, refetches active queries |
| `refetchQueries` | Immediately refetches matching queries |
| `removeQueries` | Removes queries from cache entirely |

```tsx
// Force refetch all stale queries
await queryClient.refetchQueries({ stale: true })

// Refetch active queries matching key
await queryClient.refetchQueries({
  queryKey: ['posts'],
  type: 'active'
})

// Remove all todo queries from cache
queryClient.removeQueries({ queryKey: ['todos'] })
```

### Invalidation from Mutations

```tsx
const mutation = useMutation({
  mutationFn: addTodo,
  onSuccess: () => {
    // Invalidate related queries after successful mutation
    queryClient.invalidateQueries({ queryKey: ['todos'] })
    queryClient.invalidateQueries({ queryKey: ['todoCount'] })
  },
})
```

---

## 5. Caching

### Key Cache Concepts

| Concept | Default | Description |
|---------|---------|-------------|
| `staleTime` | 0 | How long data is considered fresh |
| `gcTime` | 5 minutes | How long inactive data stays in cache |

### staleTime

```tsx
// Data stays fresh for 5 minutes
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5 * 60 * 1000,
})

// Never automatically refetch
const { data } = useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: Infinity,
})
```

**When data is stale, it will be refetched on:**
- Component mount (if `refetchOnMount: true`)
- Window focus (if `refetchOnWindowFocus: true`)
- Network reconnect (if `refetchOnReconnect: true`)
- Interval (if `refetchInterval` is set)

### gcTime (Garbage Collection Time)

```tsx
// Keep inactive data for 30 minutes
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  gcTime: 30 * 60 * 1000,
})
```

### Cache Lifecycle Example

```
1. useQuery(['todos']) called
   -> Cache MISS, fetch starts, status: 'pending'

2. Fetch completes
   -> Data cached, status: 'success'
   -> staleTime countdown starts

3. staleTime expires (default: immediately)
   -> Data marked as 'stale'

4. Component unmounts
   -> Query becomes 'inactive'
   -> gcTime countdown starts

5. gcTime expires (default: 5 min)
   -> Data garbage collected from cache
```

### Background Refetch

```tsx
const { data, isFetching } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 60 * 1000, // Fresh for 1 minute
})

// data is shown immediately (if cached)
// isFetching is true during background refetch
return (
  <div>
    {isFetching && <Spinner />}
    <TodoList todos={data} />
  </div>
)
```

### Global Cache Defaults

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
})
```

---

## 6. Infinite Queries

### Basic useInfiniteQuery

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // Return next page param, or undefined if no more pages
      return lastPage.nextCursor ?? undefined
    },
    getPreviousPageParam: (firstPage, allPages) => {
      return firstPage.prevCursor ?? undefined
    },
  })

  if (status === 'pending') return <p>Loading...</p>
  if (status === 'error') return <p>Error!</p>

  return (
    <>
      {data.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.posts.map((post) => (
            <Post key={post.id} {...post} />
          ))}
        </React.Fragment>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? 'Loading more...'
          : hasNextPage
          ? 'Load More'
          : 'No more posts'}
      </button>
    </>
  )
}
```

### Infinite Scroll with Intersection Observer

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'

function InfiniteScroll() {
  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 0 }) => fetchItems(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  })

  // Auto-fetch when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </React.Fragment>
      ))}

      {/* Sentinel element */}
      <div ref={ref}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  )
}
```

### maxPages Option (v5)

Limit stored pages to prevent memory bloat:

```tsx
const { data } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor,
  maxPages: 3, // Only keep 3 pages in memory
})
```

### Bi-directional Scrolling

```tsx
const { data, fetchNextPage, fetchPreviousPage, hasNextPage, hasPreviousPage } =
  useInfiniteQuery({
    queryKey: ['timeline'],
    queryFn: ({ pageParam }) => fetchTimeline(pageParam),
    initialPageParam: 'now',
    getNextPageParam: (lastPage) => lastPage.olderCursor,
    getPreviousPageParam: (firstPage) => firstPage.newerCursor,
  })
```

---

## 7. Prefetching & SSR

### Client-side Prefetching

```tsx
import { useQueryClient } from '@tanstack/react-query'

function TodoList() {
  const queryClient = useQueryClient()

  const prefetchTodo = (id: number) => {
    queryClient.prefetchQuery({
      queryKey: ['todo', id],
      queryFn: () => fetchTodo(id),
      staleTime: 5 * 60 * 1000,
    })
  }

  return (
    <ul>
      {todos.map((todo) => (
        <li
          key={todo.id}
          onMouseEnter={() => prefetchTodo(todo.id)}
        >
          <Link to={`/todo/${todo.id}`}>{todo.title}</Link>
        </li>
      ))}
    </ul>
  )
}
```

### Server-Side Rendering (SSR)

#### Basic SSR Pattern

```tsx
// In your loader/getServerSideProps
export async function loader() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  return {
    dehydratedState: dehydrate(queryClient),
  }
}

// In your component
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'

function PostsPage({ dehydratedState }) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <Posts />
    </HydrationBoundary>
  )
}
```

#### Next.js Pages Router

```tsx
// pages/posts.tsx
import { dehydrate, QueryClient, useQuery } from '@tanstack/react-query'

export async function getServerSideProps() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  }
}

export default function PostsPage() {
  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  return <PostList posts={data} />
}
```

#### Next.js App Router

```tsx
// app/posts/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import Posts from './posts'

export default async function PostsPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
    </HydrationBoundary>
  )
}
```

### Parallel Prefetching

```tsx
export async function loader() {
  const queryClient = new QueryClient()

  // Prefetch multiple queries in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['posts'],
      queryFn: fetchPosts,
    }),
    queryClient.prefetchQuery({
      queryKey: ['users'],
      queryFn: fetchUsers,
    }),
  ])

  return { dehydratedState: dehydrate(queryClient) }
}
```

### Error Handling in SSR

```tsx
export async function loader() {
  const queryClient = new QueryClient()

  try {
    // Use fetchQuery when you need the error
    await queryClient.fetchQuery({
      queryKey: ['posts'],
      queryFn: fetchPosts,
    })
  } catch (error) {
    // Handle 404, 500, etc.
    throw new Response('Not Found', { status: 404 })
  }

  return { dehydratedState: dehydrate(queryClient) }
}
```

---

## 8. DevTools

### Installation

```bash
npm install @tanstack/react-query-devtools
# or
yarn add @tanstack/react-query-devtools
# or
pnpm add @tanstack/react-query-devtools
```

### Basic Setup (Floating Mode)

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Configuration Options

```tsx
<ReactQueryDevtools
  initialIsOpen={false}           // Start closed
  buttonPosition="bottom-right"   // Toggle button position
  position="bottom"               // Panel position
/>
```

### Embedded Panel Mode

```tsx
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

function DevPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle DevTools
      </button>
      {isOpen && <ReactQueryDevtoolsPanel />}
    </>
  )
}
```

### Production Lazy Loading

```tsx
import { lazy, Suspense, useState, useEffect } from 'react'

const ReactQueryDevtoolsProduction = lazy(() =>
  import('@tanstack/react-query-devtools/build/modern/production.js').then(
    (d) => ({ default: d.ReactQueryDevtools })
  )
)

function App() {
  const [showDevtools, setShowDevtools] = useState(false)

  useEffect(() => {
    // Allow toggling via console: window.toggleDevtools()
    window.toggleDevtools = () => setShowDevtools((prev) => !prev)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
```

### DevTools Features

- View all queries in cache
- Inspect query data, status, and metadata
- Manually trigger refetch
- Reset/remove queries
- View query timelines
- Debug stale/inactive states

---

## 9. Best Practices

### Query Key Factory Pattern

Organize query keys by feature with a factory:

```typescript
// queries/todos.ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

// Usage
useQuery({ queryKey: todoKeys.detail(5), queryFn: () => fetchTodo(5) })

// Invalidation - target specific or broad
queryClient.invalidateQueries({ queryKey: todoKeys.all })        // All todos
queryClient.invalidateQueries({ queryKey: todoKeys.lists() })    // All lists
queryClient.invalidateQueries({ queryKey: todoKeys.detail(5) })  // Specific todo
```

### queryOptions Helper (Recommended v5 Pattern)

Co-locate query configuration for type safety and reusability:

```typescript
import { queryOptions } from '@tanstack/react-query'

// Define query options
export function todoQueryOptions(id: number) {
  return queryOptions({
    queryKey: ['todos', id],
    queryFn: () => fetchTodo(id),
    staleTime: 5 * 60 * 1000,
  })
}

// Usage in components
function TodoDetail({ id }: { id: number }) {
  const { data } = useQuery(todoQueryOptions(id))
  return <div>{data?.title}</div>
}

// Usage in prefetching
queryClient.prefetchQuery(todoQueryOptions(5))

// Type-safe cache access
const todo = queryClient.getQueryData(todoQueryOptions(5).queryKey)
// ^? Todo | undefined (correctly inferred!)
```

### Custom Hook Pattern

Encapsulate query logic in custom hooks:

```typescript
// hooks/useTodos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const todoKeys = {
  all: ['todos'] as const,
  list: (filters?: TodoFilters) => [...todoKeys.all, 'list', filters] as const,
  detail: (id: number) => [...todoKeys.all, 'detail', id] as const,
}

export function useTodos(filters?: TodoFilters) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => fetchTodos(filters),
  })
}

export function useTodo(id: number) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
    enabled: !!id,
  })
}

export function useAddTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.all })
    },
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTodo,
    onSuccess: (data, variables) => {
      // Update specific todo in cache
      queryClient.setQueryData(todoKeys.detail(variables.id), data)
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: todoKeys.list() })
    },
  })
}
```

### File Organization

```
src/
├── api/
│   └── todos.ts           # API functions
├── queries/
│   ├── todoKeys.ts        # Query key factory
│   ├── todoOptions.ts     # queryOptions definitions
│   └── index.ts           # Re-exports
├── hooks/
│   ├── useTodos.ts        # Custom hooks
│   └── useTodoMutations.ts
└── components/
    └── TodoList.tsx       # Uses hooks
```

### Error Handling Patterns

```typescript
// Global error handler
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: (error) => {
        // Only throw for 500 errors
        return error.response?.status >= 500
      },
    },
  },
})

// Register global error type (TypeScript)
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AxiosError<{ message: string }>
  }
}
```

### Performance Tips

1. **Set appropriate `staleTime`** - Avoid refetching data that rarely changes

```tsx
// Config data - rarely changes
useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: Infinity,
})

// User preferences - check occasionally
useQuery({
  queryKey: ['preferences'],
  queryFn: fetchPreferences,
  staleTime: 10 * 60 * 1000, // 10 minutes
})
```

2. **Use `select` for derived data** - Avoid unnecessary re-renders

```tsx
// Only subscribe to completed todos count
const { data: completedCount } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (todos) => todos.filter(t => t.completed).length,
})
```

3. **Prefetch on hover** - Reduce perceived latency

```tsx
<Link
  to={`/user/${user.id}`}
  onMouseEnter={() => queryClient.prefetchQuery(userQueryOptions(user.id))}
>
  {user.name}
</Link>
```

4. **Use `placeholderData` wisely** - Show stale data while fetching

```tsx
// Show previous page while loading new page
placeholderData: keepPreviousData

// Show skeleton data structure
placeholderData: { items: [], total: 0 }
```

---

## Sources

- [TanStack Query Official Documentation](https://tanstack.com/query/v5/docs)
- [TanStack Query Quick Start](https://tanstack.com/query/v5/docs/framework/react/quick-start)
- [TanStack Query Overview](https://tanstack.com/query/v5/docs/framework/react/overview)
- [Queries Guide](https://tanstack.com/query/v5/docs/framework/react/guides/queries)
- [Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [Query Invalidation Guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [Caching Examples](https://tanstack.com/query/v5/docs/framework/react/guides/caching)
- [Important Defaults](https://tanstack.com/query/v5/docs/react/guides/important-defaults)
- [Infinite Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Server Rendering & Hydration](https://tanstack.com/query/v5/docs/framework/react/guides/ssr)
- [Advanced Server Rendering](https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr)
- [Prefetching & Router Integration](https://tanstack.com/query/v5/docs/react/guides/prefetching)
- [DevTools Documentation](https://tanstack.com/query/v5/docs/react/devtools)
- [Query Options Guide](https://tanstack.com/query/v5/docs/react/guides/query-options)
- [TypeScript Guide](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [useQuery Reference](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)
- [useMutation Reference](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation)
- [useInfiniteQuery Reference](https://tanstack.com/query/v5/docs/framework/react/reference/useInfiniteQuery)
- [QueryClient Reference](https://tanstack.com/query/v5/docs/reference/QueryClient)
- [Migrating to v5 Guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Placeholder Query Data Guide](https://tanstack.com/query/v5/docs/react/guides/placeholder-query-data)
- [TkDodo's Blog - Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
- [TkDodo's Blog - The Query Options API](https://tkdodo.eu/blog/the-query-options-api)
- [TkDodo's Blog - Automatic Query Invalidation](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)
- [Announcing TanStack Query v5](https://tanstack.com/blog/announcing-tanstack-query-v5)
