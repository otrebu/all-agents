---
depends: []
---

# TanStack Table

Headless UI for data tables. You control markup & styling; it handles sorting, filtering, pagination.

## Install

```bash
pnpm add @tanstack/react-table
```

## Basic Table (Type-Safe)

```tsx
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

type User = { id: string; name: string; email: string };

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor("id", { header: "ID" }),
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => <a href={`mailto:${info.getValue()}`}>{info.getValue()}</a>,
  }),
];

function UsersTable({ data }: { data: User[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Sorting (Type-Safe)

`getIsSorted()` returns `false | 'asc' | 'desc'`. Handle with switch, not type assertions:

```tsx
import { getSortedRowModel, SortingState } from "@tanstack/react-table";

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  switch (direction) {
    case "asc":
      return <span aria-label="sorted ascending">↑</span>;
    case "desc":
      return <span aria-label="sorted descending">↓</span>;
    case false:
      return null;
  }
}

// In component:
const [sorting, setSorting] = useState<SortingState>([]);

const table = useReactTable({
  data,
  columns,
  state: { sorting },
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});

// In header:
<th onClick={header.column.getToggleSortingHandler()}>
  {flexRender(header.column.columnDef.header, header.getContext())}
  <SortIndicator direction={header.column.getIsSorted()} />
</th>
```

## Filtering

```tsx
import { getFilteredRowModel, ColumnFiltersState } from "@tanstack/react-table";

const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

const table = useReactTable({
  data,
  columns,
  state: { columnFilters },
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});

// Filter input - getFilterValue() returns unknown, use String() for safe coercion
<input
  value={String(table.getColumn("name")?.getFilterValue() ?? "")}
  onChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}
  placeholder="Filter by name..."
/>
```

## Pagination

```tsx
import { getPaginationRowModel, PaginationState } from "@tanstack/react-table";

const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0,
  pageSize: 10,
});

const table = useReactTable({
  data,
  columns,
  state: { pagination },
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});

// Controls
<button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
  Previous
</button>
<span>
  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
</span>
<button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
  Next
</button>
```

## Server-Side Data

```tsx
const table = useReactTable({
  data,
  columns,
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  pageCount: Math.ceil(totalCount / pageSize),
  state: { pagination, sorting, columnFilters },
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
});

// Fetch when state changes
useEffect(() => {
  fetchData({ page: pagination.pageIndex, sort: sorting, filters: columnFilters });
}, [pagination, sorting, columnFilters]);
```

## When to Use

| Scenario              | TanStack Table | Alternative        |
| --------------------- | -------------- | ------------------ |
| Custom styled tables  | Yes            | -                  |
| Complex data grids    | Yes            | AG Grid (paid)     |
| Simple display table  | Maybe          | Plain HTML         |
| Spreadsheet-like      | No             | Handsontable       |

TanStack Table = headless, flexible, any UI framework, full control over markup.
