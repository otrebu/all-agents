---
depends: []
tags: []
---

# Data Table UI Patterns

Table state (sort, filter, page) lives in the URL and drives server requests. Applies to any data table: admin panels, user lists, order histories, product catalogs.

## Server-Driven vs Client-Driven

| Factor             | Client-Driven                        | Server-Driven                          |
| ------------------ | ------------------------------------ | -------------------------------------- |
| Dataset size       | < ~1000 rows                         | Any size                               |
| Data loading       | All rows upfront                     | Page at a time                         |
| Sort/filter        | In browser (JS)                      | API handles it                         |
| API round-trips    | Only initial load                    | Every interaction                      |
| URL-shareable      | Optional (can add)                   | Built-in                               |
| Filter complexity  | Limited by client memory/performance | Can leverage DB indexes, full-text     |
| Offline capable    | Yes, once loaded                     | No                                     |

**Decision:** Start client-driven if dataset is small and bounded. Switch to server-driven when any of: dataset exceeds ~1000 rows, need complex server-side filtering, need shareable/bookmarkable table states.

## URL as Single Source of Truth

Table state serialized to URL search params (e.g., `?sort=name&dir=asc&page=2&status=active`).

**Benefits:**
- Shareable links -- paste a URL and the recipient sees the exact same table view
- Back button works -- browser history tracks table state transitions
- Refresh-safe -- no state lost on page reload
- Deep-linkable -- link directly to a filtered/sorted/paged view

The URL IS the state. No separate state store needed for table configuration.

```typescript
type TableState = {
  sortBy: string
  sortDir: 'asc' | 'desc'
  filters: Record<string, string | string[]>
  page: number
  pageSize: number
}
```

Read `TableState` from URL params on mount. Write it back on every interaction. The component that parses the URL is the single owner of table state.

## The Wiring Loop

```
User interaction --> URL update --> API request --> Render --> User interaction
```

1. **User interaction:** User clicks a sort header, types in a filter, or clicks a page number.
2. **URL update:** The handler updates URL search params (not component state). This is a `pushState` or `replaceState` call.
3. **API request:** A data-fetching layer watches the URL. When params change, it fires a request to the server with the new sort/filter/page params.
4. **Render:** Server returns the data slice. Table re-renders with the new rows, updated sort indicators, and pagination controls.

The URL is the coordination point. The UI reads from it, the API request builder reads from it. No prop drilling or global state needed for table config.

## Column Definitions

Declare columns as data, not as JSX or template markup. The table component reads these definitions to render sort indicators, filter controls, and cell content.

```typescript
type ColumnDef = {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'select' | 'date-range'
  filterOptions?: string[]  // for select type
}
```

Example usage:

```typescript
const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true, filterable: true, filterType: 'text' },
  { key: 'status', label: 'Status', sortable: true, filterable: true, filterType: 'select', filterOptions: ['active', 'inactive', 'pending'] },
  { key: 'createdAt', label: 'Created', sortable: true, filterable: true, filterType: 'date-range' },
  { key: 'email', label: 'Email', sortable: false, filterable: true, filterType: 'text' },
]
```

The table component iterates `columns` to render headers with sort toggles (if `sortable`) and filter inputs (based on `filterType`). Cell rendering is a separate concern (render functions, formatters, or slot-based).

## UI States

Handle these as first-class concerns, not afterthoughts:

- **Loading:** Show skeleton rows or a spinner overlay. Never show an empty table body during load -- it looks broken.
- **Empty (no data):** "No items yet" with a call-to-action (create first item). This means the resource collection is genuinely empty.
- **Empty (no matches):** "No results match your filters" with a "Clear filters" action. Distinct from no-data -- the user has data, the filters are just too narrow.
- **Error:** Show error message with a retry button. Preserve current filters/sort in the URL so retry re-fetches the same view.
- **Stale:** Show previous data while refetching (stale-while-revalidate). Optionally dim rows or show a subtle loading indicator. Avoids layout shift and content flash.

## Filter Serialization

Encode filter state in URL search params. Keep it flat and readable.

| Pattern          | URL encoding                              | Notes                        |
| ---------------- | ----------------------------------------- | ---------------------------- |
| Simple value     | `?status=active`                          | Single string param          |
| Multiple values  | `?status=active,pending`                  | Comma-separated              |
| Multiple values  | `?status=active&status=pending`           | Repeated param (also valid)  |
| Date range       | `?from=2024-01-01&to=2024-12-31`         | Separate params for bounds   |
| Text search      | `?q=john`                                 | Generic search term          |

**Rules:**
- Pick one multi-value encoding style and stick with it across the app.
- Clearing a filter removes the param entirely from the URL. Don't leave `?status=` (empty string).
- Default values should be omitted from the URL -- parse missing params as their defaults.
- Avoid deeply nested filter objects in URLs. If you need complex filters, consider a filter ID that maps to a saved server-side filter.

## Best Practices

- **Omit defaults from URL.** If default sort is `createdAt desc` and page is `1`, don't include them in the URL. Cleaner links, same behavior.
- **Reset page on filter change.** When the user changes a filter or sort, reset `page` to `1`. The old page number is meaningless for the new result set.
- **Debounce text inputs.** 300ms is typical. Don't fire an API request on every keystroke in a search/filter field.
- **Preserve state on navigation.** If the user navigates away and comes back, restore their table state from the URL (which the browser preserves in history).
- **Prefetch next page.** After rendering page N, prefetch page N+1 in the background. Makes pagination feel instant.
- **Consistent empty state distinction.** Always differentiate "no data exists" from "no results match filters." Different copy, different actions.
- **Pagination mechanics:** See @context/blocks/construct/pagination.md for cursor vs offset, page size selection, and total count strategies.
- **Response envelope:** See @context/blocks/construct/api-responses.md for how the server wraps paginated data (items, total, cursors).
