---
depends: []
tags: []
---

# Offset Pagination

Page-based pagination for REST and RPC APIs. Client requests a page number and page size, server returns the data slice plus metadata.

## How It Works

- Client sends: `?page=1&pageSize=20` (or `?offset=0&limit=20`)
- Server translates to SQL: `LIMIT 20 OFFSET 0`
- Server returns: data slice + pagination metadata
- Page 2 → `OFFSET 20`, Page 3 → `OFFSET 40`, etc.
- Formula: `offset = (page - 1) * pageSize`

## Request Parameters

```typescript
type PaginationParams = {
  page: number      // 1-indexed (not 0-indexed — page 1 is the first page)
  pageSize: number   // items per page
}
```

- Use `page` + `pageSize` (not `offset` + `limit`) for client-facing APIs. More intuitive for frontend developers.
- `offset` + `limit` is fine for internal/low-level APIs where the consumer is another service.

## Response Metadata

What the server returns alongside data:

```typescript
type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number     // total items matching the query (before pagination)
    page: number      // current page (echo back)
    pageSize: number  // items per page (echo back)
    totalPages: number // Math.ceil(total / pageSize)
    hasMore: boolean   // page < totalPages
  }
}
```

- Always include `total` — clients need it for "Showing 1-20 of 150" UI and to render page controls.
- `totalPages` and `hasMore` are derived but save the client from calculating them.
- Echo back `page` and `pageSize` so the client doesn't have to track what it sent.

## Server-Side Limits

Enforce boundaries on pagination parameters:

- Set a maximum `pageSize` (e.g., 100). Reject or clamp requests above it.
- Set a default `pageSize` (e.g., 20) when the client omits it.
- Minimum `page` is 1. Return 400 for 0 or negative.
- If `page` exceeds `totalPages`, return empty `data: []` with correct `meta` (not a 404).

```typescript
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function normalizePagination(params: Partial<PaginationParams>): PaginationParams {
  return {
    page: Math.max(1, params.page ?? 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE)),
  }
}
```

## Total Count

The performance consideration:

- `SELECT COUNT(*)` can be slow on large tables, especially with complex WHERE clauses.
- For most business apps (< 100K rows per query), this is fine. Don't optimize prematurely.
- If count becomes a bottleneck: cache the count with a short TTL, or return an approximate count and note it in the API docs.
- Never skip `total` to "optimize" — the UX cost of not knowing how many results exist is worse than a slightly slower query.

## Edge Cases

- **Empty results:** Return `{ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0, hasMore: false } }`. Not a 404.
- **Page beyond range:** `?page=999` on a 5-page dataset → return empty `data: []` with correct meta. Not an error.
- **Items deleted between pages:** User is on page 2, items on page 1 get deleted. Page 2 shifts — user may see duplicates or miss items. Acceptable for business apps. This is a fundamental limitation of offset pagination.
- **Concurrent inserts:** Similar to deletions — new items can shift pages. Again, acceptable for most use cases.

## Best Practices

- 1-indexed pages, not 0-indexed. `/users?page=1` returns the first page.
- Default page size of 20 is a good starting point for most tables.
- Max page size of 100 prevents accidental full-table fetches.
- Always return `total` in metadata — UI controls depend on it.
- Return empty array (not 404) for pages beyond range.
- Validate and clamp params server-side — never trust the client.
- Combine with sort/filter: pagination params work alongside `?sort=name&status=active`. The total reflects the filtered count, not the entire table.
- See @context/blocks/construct/rest-rpc-responses.md for response envelope conventions.
- See @context/blocks/construct/data-table-ui.md for how pagination integrates with table UI state.
