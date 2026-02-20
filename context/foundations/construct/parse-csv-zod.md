---
depends:
  - "@context/blocks/construct/papaparse.md"
  - "@context/blocks/construct/zod.md"
tags: []
---

# CSV Parse + Validate with Zod

Pipeline: CSV string -> PapaParse -> raw rows -> Zod validation -> typed data + errors. Row-level error accumulation for preview/reporting.

## References

@context/blocks/construct/papaparse.md -- CSV parsing
@context/blocks/construct/zod.md -- Schema validation

---

## The Pipeline

```
CSV string → Papa.parse() → raw rows (string fields) → Zod safeParse per row → validated rows + errors
```

PapaParse handles CSV parsing (delimiters, quoting, headers). Zod handles type coercion and validation. Keep them separate -- no `dynamicTyping`.

---

## Define the Schema

```typescript
import { z } from 'zod'
const rowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.coerce.number().int().positive('Age must be positive'), // coerce: CSV fields are strings
  status: z.enum(['active', 'inactive']).default('active'),
})
type Row = z.infer<typeof rowSchema>
```

---

## Parse and Validate

```typescript
import Papa from 'papaparse'
type ParseResult<T> = { rows: T[]; errors: { row: number; message: string }[] }

function parseCsv<T>(csv: string, schema: z.ZodType<T>): ParseResult<T> {
  const parsed = Papa.parse(csv, {
    header: true,         // returns objects, not arrays
    skipEmptyLines: true, // avoid blank row noise
    // NO dynamicTyping -- let Zod handle coercion for predictability
  })
  const rows: T[] = []
  const errors: { row: number; message: string }[] = []
  for (const err of parsed.errors)
    errors.push({ row: err.row + 1, message: err.message })
  for (let i = 0; i < parsed.data.length; i++) {
    const result = schema.safeParse(parsed.data[i])
    if (result.success) {
      rows.push(result.data)
    } else {
      const msg = result.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; ')
      errors.push({ row: i + 1, message: msg }) // 1-indexed for spreadsheet parity
    }
  }
  return { rows, errors }
}
```

Both parse errors and validation errors land in the same `errors` array.

## Usage

```typescript
const csv = `name,email,age,status
Alice,alice@example.com,30,active
Bob,invalid-email,25,active
,charlie@example.com,-5,unknown`

const result = parseCsv(csv, rowSchema)
// result.rows  → [{ name: 'Alice', email: 'alice@example.com', age: 30, status: 'active' }]
// result.errors → [
//   { row: 2, message: 'email: Invalid email' },
//   { row: 3, message: 'name: Name is required; age: ...; status: ...' },
// ]
```

## Header Normalization

For messy CSVs with inconsistent casing/whitespace, use `transformHeader`:

```typescript
Papa.parse(csv, {
  header: true, skipEmptyLines: true,
  transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
})
```

## Best Practices

- Disable `dynamicTyping` -- let Zod coerce types for predictable behavior.
- Use `z.coerce.number()` and `z.coerce.date()` for string-to-type conversion.
- Accumulate all errors, don't fail on first. Users need all problems at once.
- 1-index row numbers in errors -- matches spreadsheet row numbers.
- `ParseResult` shape feeds into preview-apply pattern (see @context/blocks/construct/preview-apply.md).
- For XML parsing with the same pattern, see @context/foundations/construct/parse-xml-zod.md.
