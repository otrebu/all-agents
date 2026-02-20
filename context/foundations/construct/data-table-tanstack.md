---
depends:
  - "@context/blocks/construct/data-table-ui.md"
  - "@context/blocks/construct/tanstack-table.md"
  - "@context/blocks/construct/tanstack-query.md"
  - "@context/blocks/construct/tanstack-router.md"
  - "@context/blocks/construct/pagination.md"
tags: []
---

# Data Table with TanStack

Wiring TanStack Table + TanStack Query + TanStack Router into a server-driven data table. URL search params drive the API request, Query manages server state, Table renders the result.

## References

@context/blocks/construct/data-table-ui.md - generic data table UI patterns (URL state, wiring loop, column defs)
@context/blocks/construct/tanstack-table.md - TanStack Table API reference
@context/blocks/construct/tanstack-query.md - TanStack Query API reference
@context/blocks/construct/tanstack-router.md - TanStack Router API reference
@context/blocks/construct/pagination.md - pagination patterns

## The Wiring

```
TanStack Router (URL search params)
     | reads state
TanStack Query (fetches data using URL state as query key)
     | provides data
TanStack Table (renders with column defs + data)
     | user interaction
TanStack Router (updates URL search params)
```

Router owns the state. Query fetches based on that state. Table renders the result. User interactions flow back to the router.

## URL State with Router

```typescript
import { z } from 'zod'

const tableSearchSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(20),
  sortBy: z.string().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/users')({
  validateSearch: tableSearchSchema,
})

const { page, pageSize, sortBy, sortDir, status, q } = Route.useSearch()

const navigate = Route.useNavigate()
const setSearch = (updates: Partial<z.infer<typeof tableSearchSchema>>) => {
  navigate({
    search: (prev) => ({ ...prev, ...updates, page: 1 }),  // reset page on filter change
  })
}
```

## Data Fetching with Query

```typescript
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'

function useUsersTable() {
  const search = Route.useSearch()
  return useQuery({
    queryKey: ['users', search],  // URL state IS the cache key
    queryFn: () => fetchUsers(search),
    placeholderData: keepPreviousData,  // show old data while fetching
  })
}
```

Key insight: the URL search params object IS the query key. When URL changes, Query automatically refetches. `keepPreviousData` prevents content flash during page/sort/filter changes.

Prefetch next page:

```typescript
const queryClient = useQueryClient()
useEffect(() => {
  if (query.data?.meta.hasMore) {
    queryClient.prefetchQuery({
      queryKey: ['users', { ...search, page: search.page + 1 }],
      queryFn: () => fetchUsers({ ...search, page: search.page + 1 }),
    })
  }
}, [query.data, search])
```

## Table Setup

```typescript
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table'

function UsersTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, isLoading, isError } = useUsersTable()

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? -1,
    state: {
      sorting: [{ id: search.sortBy, desc: search.sortDir === 'desc' }],
      pagination: { pageIndex: search.page - 1, pageSize: search.pageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(table.getState().sorting) : updater
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: next[0]?.id ?? 'createdAt',
          sortDir: next[0]?.desc ? 'desc' : 'asc',
          page: 1,
        }),
      })
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(table.getState().pagination) : updater
      navigate({
        search: (prev) => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }),
      })
    },
  })
  // ... render table, handle loading/error/empty states
}
```

`manualSorting` and `manualPagination` tell Table the server handles these -- Table just renders, no client-side sort/paginate.

## Column Definitions

Use `createColumnHelper<T>()` to define columns with `enableSorting` per column. See @context/blocks/construct/tanstack-table.md for full column API. Key point: columns are static definitions -- the glue is in `useReactTable` config above, not in column defs.

## Best Practices

- URL search params = query key = single source of truth. No separate state stores.
- Use `keepPreviousData` on every table query. Prevents content flash.
- Set `manualSorting` and `manualPagination` to true. Server does the work.
- Reset `page` to 1 when sort or filter changes (in the navigate call).
- Prefetch next page after current page loads for instant pagination feel.
- Validate search params with Zod schema in route definition -- malformed URLs get defaults.
- See @context/blocks/construct/data-table-ui.md for the generic pattern (UI states, filter serialization, decision matrix).
