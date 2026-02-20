---
depends: []
tags: []
---

# Preview-Apply Pattern

> Dry-run then commit. Separate "compute what would happen" from "do it." Two explicit API calls. Used for imports, bulk updates, migrations, config changes.

## The Pattern

User submits data. System shows a preview of what will happen. User reviews. User confirms. System applies.

Two separate API calls:

- **Preview** — read-only, computes the diff, returns what would happen. No side effects.
- **Apply** — executes the operation for real. Writes to the database.

Preview and apply receive the same input payload. The preview response is for the user to review, not a server-side cache to recall later.

## API Design

Two explicit endpoints, same input payload:

```
POST /imports/preview   -> returns what will happen (no side effects)
POST /imports/apply     -> executes the operation
```

Both receive the same request body. Preview computes the diff. Apply re-derives and executes.

This pattern works for any resource, not just imports. Replace `/imports` with `/migrations`, `/bulk-updates`, `/config-changes`, etc.

## Preview Response

```typescript
type PreviewResult<T> = {
  toCreate: T[]
  toUpdate: T[]
  toSkip: T[]
  errors: { row: number; message: string }[]
  summary: {
    create: number
    update: number
    skip: number
    error: number
  }
}
```

- `toCreate` — new items that don't exist yet.
- `toUpdate` — existing items that will be modified.
- `toSkip` — items with no changes needed.
- `errors` — items that can't be processed (validation failures, conflicts).
- `summary` — counts for quick display: "5 new, 3 updated, 1 skipped, 2 errors."

## Apply Response

```typescript
type ApplyResult = {
  created: number
  updated: number
  skipped: number
  failed: number
  failures: { row: number; reason: string }[]
}
```

## Apply Semantics

- Apply re-derives the same operation from the input. No server-side preview storage, no preview IDs to manage.
- Wrap in a database transaction — all-or-nothing. If any row fails, roll back everything.
- If the preview showed errors, block apply in the UI. Don't let users submit an apply request when the preview has unresolved errors.

## Best Practices

- Preview must be fast — no writes, no side effects, no external calls if possible.
- Preview and apply receive the same input. The preview response is for the user, not a server-side cache.
- Block apply in the UI when preview has errors. The API should also reject apply if validation fails (defense in depth).
- Wrap apply in a transaction. Partial applies create inconsistent state that's hard to debug.
- For long-running applies (thousands of rows), return a job ID and let the client poll for progress. Don't hold an HTTP connection open.
- Show the summary counts prominently in the UI. Users should see "5 new, 3 updated, 2 errors" at a glance before deciding to apply.
