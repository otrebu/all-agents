---
depends: []
---

# Error Handling

Prefer explicit error handling with typed errors.

## Error Accumulation

When processing a batch of items (CSV rows, form fields, API payloads), don't fail on first error. Collect all errors and return them together so the caller sees every problem at once.

**Pattern:** iterate items, validate each, accumulate failures with their index, separate valid from invalid. Return both — the caller decides whether to proceed with partial results or reject the whole batch.

```typescript
type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] }

type BatchResult<T> = {
  valid: T[]
  errors: { index: number; errors: string[] }[]
}

function validateBatch<T>(
  items: unknown[],
  validate: (item: unknown) => ValidationResult<T>,
): BatchResult<T> {
  const valid: T[] = []
  const errors: BatchResult<T>['errors'] = []

  for (let i = 0; i < items.length; i++) {
    const result = validate(items[i])
    if (result.success) {
      valid.push(result.data)
    } else {
      errors.push({ index: i, errors: result.errors })
    }
  }
  return { valid, errors }
}
```

Caller examples:

```typescript
const { valid, errors } = validateBatch(rows, myValidator)

// Strict — reject entire batch if any errors
if (errors.length > 0) throw new Error(`${errors.length} invalid items`)

// Lenient — proceed with valid items, report errors separately
processItems(valid)
reportErrors(errors)
```

See `@context/foundations/construct/parse-csv-zod.md` for a Zod-specific implementation of this pattern.
