---
depends: []
tags: []
---

# PapaParse

CSV parsing and generation for browser and Node.js.

## Install

- `papaparse` (runtime)
- `@types/papaparse` (dev, TypeScript types)

## Parse CSV

```typescript
import Papa from 'papaparse'

const result = Papa.parse(csvString, {
  header: true,        // first row as keys
  skipEmptyLines: true,
  dynamicTyping: true, // auto-convert numbers/booleans
})

result.data    // parsed rows
result.errors  // parse errors (row-level)
result.meta    // delimiter, linebreak, fields
```

## Generate CSV

```typescript
const csv = Papa.unparse(arrayOfObjects)
// or with explicit columns:
const csv = Papa.unparse({
  fields: ['name', 'email', 'age'],
  data: arrayOfObjects,
})
```

## Typed Rows

```typescript
type RawRow = {
  name: string
  email: string
  age: string  // everything is string before validation
}

const result = Papa.parse<RawRow>(csvString, { header: true })
// result.data is RawRow[] — validate with Zod in the next step
```

PapaParse types are loose. Real validation belongs in a separate step (see parse-csv-zod foundation).

## Key Config Options

| Option | Default | Purpose |
|---|---|---|
| `header` | false | Use first row as object keys |
| `skipEmptyLines` | false | Ignore blank lines |
| `dynamicTyping` | false | Auto-convert numbers and booleans |
| `delimiter` | auto-detect | Override column separator |
| `transformHeader` | - | Function to clean/rename header names |
| `complete` | - | Callback when parsing finishes (async mode) |

## Gotchas

- `dynamicTyping` can misinterpret values (e.g., "001" becomes `1`). Disable it and validate manually if you need exact string preservation.
- `header: true` requires the first row to be column names. If your CSV has no header row, use `header: false` and access `result.data` as arrays.
- Parse errors are per-row in `result.errors`, not thrown. Always check `result.errors.length`.
