# TanStack Table v8

> Headless UI for building powerful tables and datagrids for React, Vue, Solid, Svelte, and more.

## Overview

TanStack Table (formerly React Table) is a **headless UI library** for building tables and datagrids. Version 8 was a complete rewrite from the ground up in TypeScript, offering improved performance, better type safety, and a framework-agnostic core with adapters for multiple frameworks.

### What is Headless UI?

A headless UI library provides the logic, state management, processing, and APIs for UI elements without providing markup, styles, or pre-built implementations. TanStack Table doesn't render any DOM elements - you have 100% control over the markup and styling.

**Benefits:**
- Complete control over HTML structure and CSS styling
- Logic and components are modular and reusable
- Framework-agnostic core (same API across React, Vue, Solid, Svelte)
- No default styles to override
- Smaller bundle size (tree-shakable features)

### When to Use TanStack Table

**Use TanStack Table when:**
- You need full control over design and styling
- You want a lighter-weight solution
- You're building a custom table component library
- You need framework flexibility

**Consider alternatives when:**
- You want a ready-to-use component with built-in styling
- Bundle size and design control aren't priorities

---

## Installation

```bash
# npm
npm install @tanstack/react-table

# pnpm
pnpm add @tanstack/react-table

# yarn
yarn add @tanstack/react-table
```

**Compatibility:** Works with React 16.8, 17, 18, and 19.

---

## Core Concepts

### Table Instance

The table instance is the core object containing table state and APIs. It's created using `useReactTable` (or framework-specific equivalents like `createSolidTable`, `useVueTable`).

```tsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
})
```

### Required Options

Every table requires two options:
- **`data`**: Array of row data objects
- **`columns`**: Array of column definitions

### Tree-Shakable Row Models

Features are imported as separate row model functions, enabling tree-shaking:

```tsx
import {
  getCoreRowModel,       // Required
  getSortedRowModel,     // Sorting
  getFilteredRowModel,   // Filtering
  getPaginationRowModel, // Pagination
  getExpandedRowModel,   // Row expansion
  getGroupedRowModel,    // Grouping
} from '@tanstack/react-table'
```

---

## Basic Setup Example

```tsx
import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

// 1. Define your data type
type Person = {
  firstName: string
  lastName: string
  age: number
  status: string
}

// 2. Sample data
const defaultData: Person[] = [
  { firstName: 'Tanner', lastName: 'Linsley', age: 24, status: 'Active' },
  { firstName: 'Tandy', lastName: 'Miller', age: 40, status: 'Inactive' },
  { firstName: 'Joe', lastName: 'Dirte', age: 45, status: 'Active' },
]

// 3. Create column helper for type safety
const columnHelper = createColumnHelper<Person>()

// 4. Define columns
const columns = [
  columnHelper.accessor('firstName', {
    cell: info => info.getValue(),
    header: () => 'First Name',
  }),
  columnHelper.accessor('lastName', {
    cell: info => <i>{info.getValue()}</i>,
    header: () => <span>Last Name</span>,
  }),
  columnHelper.accessor('age', {
    header: () => 'Age',
    cell: info => info.renderValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
  }),
]

// 5. Create and render the table
function App() {
  const [data] = React.useState(() => [...defaultData])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## Column Definitions

Column definitions are the core building blocks for data display, extraction, and formatting.

### Three Types of Columns

1. **Accessor Columns**: Have an underlying data model - can be sorted, filtered, grouped
2. **Display Columns**: No data model - for arbitrary content (action buttons, checkboxes, expanders)
3. **Grouping Columns**: No data model - for organizing other columns together

### Using createColumnHelper (Recommended)

The `createColumnHelper` function provides the best TypeScript type inference:

```tsx
import { createColumnHelper } from '@tanstack/react-table'

type Person = {
  firstName: string
  lastName: string
  age: number
  email: string
}

const columnHelper = createColumnHelper<Person>()

const columns = [
  // Simple accessor using object key
  columnHelper.accessor('firstName', {
    header: 'First Name',
  }),

  // Accessor with custom cell renderer
  columnHelper.accessor('lastName', {
    header: () => <span>Last Name</span>,
    cell: info => <b>{info.getValue()}</b>,
  }),

  // Computed/derived value using accessor function
  columnHelper.accessor(row => `${row.firstName} ${row.lastName}`, {
    id: 'fullName', // Required when using accessor function
    header: 'Full Name',
  }),

  // Display column (no data accessor)
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: props => (
      <button onClick={() => handleEdit(props.row.original)}>
        Edit
      </button>
    ),
  }),
]
```

### Manual Column Definitions

Without the column helper, use `ColumnDef<TData>[]`:

```tsx
import { ColumnDef } from '@tanstack/react-table'

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: 'firstName',  // Object key accessor
    header: 'First Name',
  },
  {
    accessorFn: row => row.lastName,  // Function accessor
    id: 'lastName',
    header: 'Last Name',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <ActionMenu person={row.original} />,
  },
]
```

### Column Definition Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `string` | Unique column identifier (optional if using accessorKey/string header) |
| `accessorKey` | `string` | Object key for extracting cell value |
| `accessorFn` | `(row) => any` | Function for extracting/computing cell value |
| `header` | `string \| (props) => ReactNode` | Header content |
| `cell` | `string \| (props) => ReactNode` | Cell content renderer |
| `footer` | `string \| (props) => ReactNode` | Footer content |
| `columns` | `ColumnDef[]` | Child columns for grouped headers |
| `meta` | `object` | Custom metadata accessible via `column.columnDef.meta` |

### Cell Props

The cell function receives props with:
- `getValue()`: Get the cell's value
- `renderValue()`: Get the cell's value with fallback
- `row`: The row object
- `row.original`: The original data object
- `table`: The table instance
- `column`: The column instance

```tsx
columnHelper.accessor('status', {
  cell: ({ getValue, row }) => {
    const status = getValue()
    const person = row.original
    return (
      <span className={status === 'active' ? 'text-green' : 'text-red'}>
        {person.firstName}: {status}
      </span>
    )
  },
})
```

---

## Sorting

TanStack Table provides comprehensive sorting with built-in functions and custom sorting support.

### Basic Setup

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'

function SortableTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                style={{ cursor: 'pointer' }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{
                  asc: ' ^',
                  desc: ' v',
                }[header.column.getIsSorted() as string] ?? null}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      {/* ... */}
    </table>
  )
}
```

### Sorting State

```tsx
type ColumnSort = {
  id: string    // Column ID
  desc: boolean // true = descending
}
type SortingState = ColumnSort[]

// Example: sorted by age ascending, then name descending
const sorting: SortingState = [
  { id: 'age', desc: false },
  { id: 'name', desc: true },
]
```

### Built-in Sorting Functions

| Function | Description |
|----------|-------------|
| `alphanumeric` | Natural sort (1, 2, 10), case-insensitive |
| `alphanumericCaseSensitive` | Natural sort, case-sensitive |
| `text` | String sort, case-insensitive |
| `textCaseSensitive` | String sort, case-sensitive |
| `datetime` | For Date objects |
| `basic` | Simple comparison operators |

### Custom Sorting Functions

```tsx
const columns = [
  columnHelper.accessor('priority', {
    sortingFn: (rowA, rowB, columnId) => {
      const priorityOrder = { low: 0, medium: 1, high: 2 }
      return priorityOrder[rowA.getValue(columnId)] -
             priorityOrder[rowB.getValue(columnId)]
    },
  }),
]

// Or define globally
const table = useReactTable({
  sortingFns: {
    priority: (rowA, rowB, columnId) => {
      // Custom sorting logic
      return rowA.getValue(columnId) - rowB.getValue(columnId)
    },
  },
})
```

### Column Sorting Options

```tsx
columnHelper.accessor('age', {
  enableSorting: true,          // Enable/disable sorting (default: true)
  sortDescFirst: false,         // Start with ascending (default: true for numbers)
  invertSorting: true,          // Invert direction (useful for rankings)
  sortUndefined: 'last',        // Where to place undefined: 'first' | 'last' | false | -1 | 1
  sortingFn: 'alphanumeric',    // Built-in or custom function name
})
```

### Multi-Column Sorting

Enabled by default. Users hold Shift while clicking to add columns.

```tsx
const table = useReactTable({
  enableMultiSort: true,           // Default: true
  maxMultiSortColCount: 3,         // Max columns in multi-sort
  isMultiSortEvent: (e) => e.shiftKey, // Customize trigger key
})
```

### Sorting APIs

```tsx
// Column APIs
column.getCanSort()              // Check if sortable
column.getIsSorted()             // 'asc' | 'desc' | false
column.toggleSorting(desc?, multi?)  // Toggle sort state
column.getToggleSortingHandler() // Click handler for headers
column.clearSorting()            // Remove from sort state
column.getSortIndex()            // Position in multi-sort

// Table APIs
table.setSorting(updater)        // Update sort state
table.resetSorting()             // Reset to initial state
```

---

## Filtering

TanStack Table supports both column-specific filtering and global filtering.

### Column Filtering

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table'

function FilterableTable() {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <>
      <input
        placeholder="Filter by name..."
        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
        onChange={e => table.getColumn('name')?.setFilterValue(e.target.value)}
      />
      <table>{/* ... */}</table>
    </>
  )
}
```

### Built-in Filter Functions

| Function | Description |
|----------|-------------|
| `includesString` | Case-insensitive substring match |
| `includesStringSensitive` | Case-sensitive substring match |
| `equalsString` | Case-insensitive exact match |
| `equalsStringSensitive` | Case-sensitive exact match |
| `arrIncludes` | Value exists in array |
| `arrIncludesAll` | All values exist in array |
| `arrIncludesSome` | Some values exist in array |
| `equals` | Strict equality (===) |
| `weakEquals` | Loose equality (==) |
| `inNumberRange` | Number within range [min, max] |

### Custom Filter Functions

```tsx
import { FilterFn } from '@tanstack/react-table'

const startsWithFilter: FilterFn<Person> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId) as string
  return value.toLowerCase().startsWith(filterValue.toLowerCase())
}

// Add to column definition
columnHelper.accessor('name', {
  filterFn: startsWithFilter,
})

// Or register globally
const table = useReactTable({
  filterFns: {
    startsWith: startsWithFilter,
  },
})
```

### Filter Function Helpers

```tsx
// Auto-remove filter when value is empty
startsWithFilter.autoRemove = (val) => !val

// Transform filter value before use
startsWithFilter.resolveFilterValue = (val) => val.toString().toLowerCase().trim()
```

### Global Filtering

```tsx
import { useReactTable, getFilteredRowModel } from '@tanstack/react-table'

function GlobalFilterTable() {
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString', // Default filter function
  })

  return (
    <>
      <input
        value={globalFilter ?? ''}
        onChange={e => setGlobalFilter(e.target.value)}
        placeholder="Search all columns..."
      />
      <table>{/* ... */}</table>
    </>
  )
}
```

### Filtering APIs

```tsx
// Column APIs
column.getFilterValue()      // Current filter value
column.setFilterValue(value) // Set filter value
column.getCanFilter()        // Check if filterable
column.getIsFiltered()       // Check if filter active

// Table APIs
table.setColumnFilters(updater)  // Update column filters
table.resetColumnFilters()       // Clear all column filters
table.setGlobalFilter(value)     // Set global filter
table.resetGlobalFilter()        // Clear global filter
```

---

## Pagination

TanStack Table supports both client-side and server-side pagination.

### Client-Side Pagination

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
} from '@tanstack/react-table'

function PaginatedTable() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <>
      <table>{/* ... */}</table>
      <div className="pagination">
        <button
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
        >
          {[10, 20, 30, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
```

### Pagination APIs

```tsx
// Navigation
table.firstPage()             // Go to first page
table.previousPage()          // Go to previous page
table.nextPage()              // Go to next page
table.lastPage()              // Go to last page
table.setPageIndex(index)     // Go to specific page
table.setPageSize(size)       // Change page size

// State checks
table.getCanPreviousPage()    // Can navigate back?
table.getCanNextPage()        // Can navigate forward?
table.getPageCount()          // Total number of pages
table.getRowCount()           // Total number of rows
```

---

## Row Selection

TanStack Table provides flexible row selection with checkboxes, click events, or custom UI.

### Basic Setup

```tsx
import {
  useReactTable,
  getCoreRowModel,
  RowSelectionState,
} from '@tanstack/react-table'

function SelectableTable() {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true, // Enable for all rows
    // enableRowSelection: row => row.original.canSelect, // Conditional
  })

  // Access selected rows
  const selectedRows = table.getSelectedRowModel().rows
}
```

### Checkbox Column

```tsx
const columns = [
  {
    id: 'select',
    header: ({ table }) => (
      <IndeterminateCheckbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <IndeterminateCheckbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  },
  // ... other columns
]

// IndeterminateCheckbox component
function IndeterminateCheckbox({
  indeterminate,
  ...rest
}: { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current && typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate
    }
  }, [indeterminate, rest.checked])

  return <input type="checkbox" ref={ref} {...rest} />
}
```

### Selection Options

```tsx
const table = useReactTable({
  enableRowSelection: true,              // Enable row selection
  enableMultiRowSelection: true,         // Allow multiple selection (false = single)
  enableSubRowSelection: true,           // Auto-select sub-rows
  getRowId: row => row.id,               // Custom row ID (instead of array index)
})
```

### Selection APIs

```tsx
// Row APIs
row.getIsSelected()           // Check if selected
row.getCanSelect()            // Check if selectable
row.toggleSelected(value?)    // Toggle selection
row.getToggleSelectedHandler() // Click handler

// Table APIs
table.getIsAllRowsSelected()         // All rows selected?
table.getIsSomeRowsSelected()        // Some rows selected?
table.toggleAllRowsSelected(value?)  // Toggle all
table.getToggleAllRowsSelectedHandler()      // Handler for all rows
table.getToggleAllPageRowsSelectedHandler()  // Handler for current page
table.getSelectedRowModel()          // Get selected rows
table.getFilteredSelectedRowModel()  // Selected rows after filtering
```

---

## Row Expansion

Row expansion enables showing/hiding additional data related to specific rows.

### Basic Setup

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  ExpandedState,
} from '@tanstack/react-table'

function ExpandableTable() {
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true, // All rows can expand
  })
}
```

### Hierarchical Data (Sub-Rows)

```tsx
type Person = {
  id: number
  name: string
  children?: Person[]
}

const table = useReactTable({
  data,
  columns,
  getSubRows: row => row.children, // Define where to find sub-rows
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
})
```

### Expander Column

```tsx
const columns = [
  {
    id: 'expander',
    header: () => null,
    cell: ({ row }) => {
      if (!row.getCanExpand()) return null
      return (
        <button onClick={row.getToggleExpandedHandler()}>
          {row.getIsExpanded() ? '-' : '+'}
        </button>
      )
    },
  },
  // ... other columns
]
```

### Custom Expanded Content (Detail Panel)

```tsx
function ExpandableTable() {
  return (
    <tbody>
      {table.getRowModel().rows.map(row => (
        <React.Fragment key={row.id}>
          <tr>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
          {row.getIsExpanded() && (
            <tr>
              <td colSpan={row.getVisibleCells().length}>
                {/* Custom expanded content */}
                <DetailPanel data={row.original} />
              </td>
            </tr>
          )}
        </React.Fragment>
      ))}
    </tbody>
  )
}
```

### Expansion APIs

```tsx
// Row APIs
row.getCanExpand()           // Can row expand?
row.getIsExpanded()          // Is row expanded?
row.toggleExpanded(value?)   // Toggle expansion
row.getToggleExpandedHandler() // Click handler

// Table APIs
table.toggleAllRowsExpanded(value?)  // Toggle all
table.getIsAllRowsExpanded()         // All expanded?
table.getIsSomeRowsExpanded()        // Some expanded?
```

---

## Virtualization

TanStack Table integrates with @tanstack/react-virtual for rendering large datasets efficiently.

### Installation

```bash
npm install @tanstack/react-virtual
```

### Row Virtualization

```tsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedTable() {
  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35, // Estimated row height in pixels
    overscan: 5, // Number of rows to render outside viewport
  })

  return (
    <div
      ref={tableContainerRef}
      style={{ height: '500px', overflow: 'auto' }}
    >
      <table style={{ width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0 }}>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = rows[virtualRow.index]
            return (
              <tr
                key={row.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

### Dynamic Row Heights

```tsx
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 35,
  measureElement: element => element?.getBoundingClientRect().height,
  overscan: 5,
})
```

### Column Virtualization

```tsx
const columnVirtualizer = useVirtualizer({
  count: columns.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 150, // Estimated column width
  horizontal: true,
  overscan: 3,
})
```

### Performance Tips

- Keep the virtualizer in the lowest component possible to avoid unnecessary re-renders
- Use CSS Grid layout for dynamic heights
- Performance is degraded in development mode due to React's strict mode
- Set appropriate `overscan` to prevent blank spaces during fast scrolling

---

## Server-Side Operations

For large datasets, handle sorting, filtering, and pagination on the server.

### Configuration

```tsx
const table = useReactTable({
  data,
  columns,
  manualPagination: true,  // Server handles pagination
  manualSorting: true,     // Server handles sorting
  manualFiltering: true,   // Server handles filtering
  pageCount: totalPages,   // Or rowCount for auto-calculation
  getCoreRowModel: getCoreRowModel(),
  // Don't include getPaginationRowModel, getSortedRowModel, getFilteredRowModel
})
```

### Integration with TanStack Query

```tsx
import { useQuery } from '@tanstack/react-query'

function ServerTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const { data, isLoading } = useQuery({
    queryKey: ['users', sorting, pagination, columnFilters],
    queryFn: () => fetchUsers({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
      filters: columnFilters,
    }),
  })

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    state: { sorting, pagination, columnFilters },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data?.pageCount ?? -1, // -1 if unknown
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <div>Loading...</div>

  return <table>{/* ... */}</table>
}
```

### Important Considerations

- Be consistent: use server-side for all operations or client-side for all
- Mixing client-side sorting with server-side pagination only sorts loaded data
- `autoResetPageIndex` is automatically disabled when `manualPagination: true`
- Provide `rowCount` or `pageCount` for proper pagination UI

---

## TypeScript Integration

TanStack Table v8 was completely rewritten in TypeScript for improved type safety.

### Typing Data and Columns

```tsx
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'

interface User {
  id: string
  name: string
  email: string
  age: number
  status: 'active' | 'inactive'
}

// Option 1: Using createColumnHelper (recommended)
const columnHelper = createColumnHelper<User>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => info.getValue(), // getValue() returns string
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: info => info.getValue(), // getValue() returns number
  }),
]

// Option 2: Manual typing
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorFn: row => row.email, // row is typed as User
    id: 'email',
    header: 'Email',
  },
]
```

### Extending Table Meta

```tsx
import { RowData } from '@tanstack/react-table'

// Extend the TableMeta interface
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
    deleteRow: (rowIndex: number) => void
  }
}

// Use in table options
const table = useReactTable({
  data,
  columns,
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old =>
        old.map((row, index) => {
          if (index === rowIndex) {
            return { ...old[rowIndex], [columnId]: value }
          }
          return row
        })
      )
    },
    deleteRow: (rowIndex) => {
      setData(old => old.filter((_, index) => index !== rowIndex))
    },
  },
})

// Access in cell
cell: ({ table, row, column }) => {
  table.options.meta?.updateData(row.index, column.id, 'new value')
}
```

### Typing Row Selection State

```tsx
import { RowSelectionState } from '@tanstack/react-table'

const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
```

---

## Styling Approaches

TanStack Table is headless - you have complete control over styling.

### Tailwind CSS

```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      {table.getHeaderGroups()[0].headers.map(header => (
        <th
          key={header.id}
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
        </th>
      ))}
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {table.getRowModel().rows.map(row => (
      <tr key={row.id} className="hover:bg-gray-50">
        {row.getVisibleCells().map(cell => (
          <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

### Conditional Styling Based on State

```tsx
<tr
  key={row.id}
  className={cn(
    'transition-colors',
    row.getIsSelected() && 'bg-blue-50',
    row.getIsExpanded() && 'bg-gray-100',
  )}
>
```

### CSS-in-JS (styled-components)

```tsx
import styled from 'styled-components'

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const StyledTh = styled.th<{ sortable?: boolean }>`
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #ddd;
  cursor: ${props => props.sortable ? 'pointer' : 'default'};

  &:hover {
    background-color: ${props => props.sortable ? '#f5f5f5' : 'transparent'};
  }
`

const StyledTd = styled.td`
  padding: 12px;
  border-bottom: 1px solid #eee;
`

const StyledTr = styled.tr<{ selected?: boolean }>`
  background-color: ${props => props.selected ? '#e3f2fd' : 'white'};

  &:hover {
    background-color: #f5f5f5;
  }
`
```

---

## Additional Features

### Column Visibility

```tsx
const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

const table = useReactTable({
  state: { columnVisibility },
  onColumnVisibilityChange: setColumnVisibility,
})

// Toggle visibility
<button onClick={() => column.toggleVisibility()}>
  {column.getIsVisible() ? 'Hide' : 'Show'} {column.id}
</button>

// Use getVisibleLeafColumns() and getVisibleCells() for rendering
```

### Column Resizing

```tsx
const table = useReactTable({
  enableColumnResizing: true,
  columnResizeMode: 'onChange', // 'onEnd' for performance
})

// In header
<th style={{ width: header.getSize() }}>
  {flexRender(header.column.columnDef.header, header.getContext())}
  <div
    onMouseDown={header.getResizeHandler()}
    onTouchStart={header.getResizeHandler()}
    className="resizer"
  />
</th>
```

### Column Pinning

```tsx
const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
  left: ['select'],
  right: ['actions'],
})

const table = useReactTable({
  state: { columnPinning },
  onColumnPinningChange: setColumnPinning,
})

// Use sticky CSS or split into separate tables
// APIs: getLeftHeaderGroups(), getCenterHeaderGroups(), getRightHeaderGroups()
// row.getLeftVisibleCells(), row.getCenterVisibleCells(), row.getRightVisibleCells()
```

### Editable Cells

```tsx
// Extend TableMeta for update function
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
  }
}

// Default editable cell
const defaultColumn: Partial<ColumnDef<Person>> = {
  cell: ({ getValue, row: { index }, column: { id }, table }) => {
    const initialValue = getValue()
    const [value, setValue] = React.useState(initialValue)

    const onBlur = () => {
      table.options.meta?.updateData(index, id, value)
    }

    React.useEffect(() => {
      setValue(initialValue)
    }, [initialValue])

    return (
      <input
        value={value as string}
        onChange={e => setValue(e.target.value)}
        onBlur={onBlur}
      />
    )
  },
}

const table = useReactTable({
  defaultColumn,
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old =>
        old.map((row, index) => {
          if (index === rowIndex) {
            return { ...old[rowIndex], [columnId]: value }
          }
          return row
        })
      )
    },
  },
})
```

---

## Common Patterns

### Stable Data Reference

Data needs a stable reference to prevent infinite re-renders:

```tsx
// Good: useState
const [data, setData] = React.useState(() => [...initialData])

// Good: useMemo
const data = React.useMemo(() => fetchedData ?? [], [fetchedData])

// Good: Defined outside component
const staticData = [...]

// Bad: Inline array (new reference each render)
const table = useReactTable({
  data: [], // Creates new array every render!
})
```

### Debounced Filtering

```tsx
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string
  onChange: (value: string) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, debounce, onChange])

  return (
    <input
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  )
}
```

### Combining Multiple Features

```tsx
const table = useReactTable({
  data,
  columns,
  state: {
    sorting,
    columnFilters,
    globalFilter,
    pagination,
    rowSelection,
    columnVisibility,
    expanded,
  },
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  onGlobalFilterChange: setGlobalFilter,
  onPaginationChange: setPagination,
  onRowSelectionChange: setRowSelection,
  onColumnVisibilityChange: setColumnVisibility,
  onExpandedChange: setExpanded,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  enableRowSelection: true,
})
```

---

## Migration from React Table v7

Key changes when migrating:

1. **Package name**: `react-table` -> `@tanstack/react-table`
2. **Hook rename**: `useTable` -> `useReactTable`
3. **Plugin system removed**: Use tree-shakable row model imports
4. **Accessor changes**: `accessor` -> `accessorKey` or `accessorFn`
5. **Column options**: `Header` -> `header`, `Cell` -> `cell`
6. **Sizing options**: `width/minWidth/maxWidth` -> `size/minSize/maxSize`
7. **Option naming**: `disableSortBy` -> `enableSorting`
8. **Rendering**: `cell.render('Cell')` -> `flexRender(cell.column.columnDef.cell, cell.getContext())`
9. **Cell value**: `cell.value` -> `cell.getValue()`

---

## Resources

### Official Documentation
- [TanStack Table Docs](https://tanstack.com/table/v8/docs)
- [Installation Guide](https://tanstack.com/table/v8/docs/installation)
- [React Table Guide](https://tanstack.com/table/v8/docs/framework/react/react-table)

### Examples
- [Basic Example](https://tanstack.com/table/v8/docs/framework/react/examples/basic)
- [Sorting](https://tanstack.com/table/v8/docs/framework/react/examples/sorting)
- [Filtering](https://tanstack.com/table/v8/docs/framework/react/examples/filters)
- [Pagination](https://tanstack.com/table/v8/docs/framework/react/examples/pagination)
- [Row Selection](https://tanstack.com/table/v8/docs/framework/react/examples/row-selection)
- [Expanding](https://tanstack.com/table/v8/docs/framework/react/examples/expanding)
- [Virtualized Rows](https://tanstack.com/table/v8/docs/framework/react/examples/virtualized-rows)
- [Editable Data](https://tanstack.com/table/latest/docs/framework/react/examples/editable-data)
- [Column Sizing](https://tanstack.com/table/v8/docs/framework/react/examples/column-sizing)
- [Column Pinning](https://tanstack.com/table/v8/docs/framework/react/examples/column-pinning)

### Feature Guides
- [Column Definitions](https://tanstack.com/table/v8/docs/guide/column-defs)
- [Sorting Guide](https://tanstack.com/table/v8/docs/guide/sorting)
- [Column Filtering Guide](https://tanstack.com/table/v8/docs/guide/column-filtering)
- [Global Filtering Guide](https://tanstack.com/table/v8/docs/guide/global-filtering)
- [Pagination Guide](https://tanstack.com/table/v8/docs/guide/pagination)
- [Row Selection Guide](https://tanstack.com/table/v8/docs/guide/row-selection)
- [Expanding Guide](https://tanstack.com/table/v8/docs/guide/expanding)
- [Virtualization Guide](https://tanstack.com/table/v8/docs/guide/virtualization)
- [Column Visibility Guide](https://tanstack.com/table/v8/docs/guide/column-visibility)
- [Column Sizing Guide](https://tanstack.com/table/v8/docs/guide/column-sizing)
- [Column Pinning Guide](https://tanstack.com/table/v8/docs/guide/column-pinning)

### GitHub
- [TanStack Table Repository](https://github.com/TanStack/table)
