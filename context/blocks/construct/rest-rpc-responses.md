---
depends: []
tags: []
---

# REST & RPC Response Conventions

Response envelope shapes, error formats, and HTTP status codes for REST and RPC APIs. Does not cover GraphQL (which defines its own response shape via spec).

## Success Envelope

Consistent shape for all success responses. Clients always unwrap `data`.

```typescript
// Single resource
type SuccessResponse<T> = {
  data: T
}

// Collection with pagination metadata
type CollectionResponse<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }
}

// Cursor-based alternative
type CursorCollectionResponse<T> = {
  data: T[]
  meta: {
    total: number
    cursor: string | null
    hasMore: boolean
  }
}
```

- The envelope is the same shape regardless of endpoint.
- Empty success (DELETE, etc.): HTTP 204 No Content with no body, OR `{ data: null }` — pick one convention and stick with it.

## Error Envelope

```typescript
type ErrorResponse = {
  error: {
    code: string        // machine-readable: "VALIDATION_ERROR", "NOT_FOUND"
    message: string     // human-readable: "Email is required"
    details?: unknown   // optional: field-level errors, stack trace in dev
  }
}
```

- `code` is machine-readable (clients switch on it). Use SCREAMING_SNAKE_CASE.
- `message` is human-readable (for display or logging).
- `details` is optional — use for validation field errors, rate limit info, etc.
- Never expose stack traces in production. Only in development/staging.

Validation error details example:

```typescript
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    details: {
      fields: {
        email: "Required",
        age: "Must be a positive number"
      }
    }
  }
}
```

## HTTP Status Codes

The ones you actually use — not an exhaustive list.

**Success:**

| Code | Meaning    | Use when                                    |
|------|------------|---------------------------------------------|
| 200  | OK         | GET, PATCH, PUT — returning data            |
| 201  | Created    | POST — resource created, return it in body  |
| 204  | No Content | DELETE — success, no body                   |

**Client errors:**

| Code | Meaning              | Use when                                                  |
|------|----------------------|-----------------------------------------------------------|
| 400  | Bad Request          | Malformed request (invalid JSON, missing required field)  |
| 401  | Unauthorized         | No auth credentials or credentials expired                |
| 403  | Forbidden            | Authenticated but not authorized for this action          |
| 404  | Not Found            | Resource doesn't exist                                    |
| 409  | Conflict             | Duplicate entry, version conflict, state conflict         |
| 422  | Unprocessable Entity | Valid syntax but semantic errors (business rule violated)  |
| 429  | Too Many Requests    | Rate limited                                              |

**Server errors:**

| Code | Meaning                | Use when                                |
|------|------------------------|-----------------------------------------|
| 500  | Internal Server Error  | Unexpected server failure               |
| 503  | Service Unavailable    | Server overloaded or in maintenance     |

400 vs 422 — use 400 for structurally invalid requests (bad JSON, wrong types), 422 for semantically invalid requests (valid structure but business rules violated). Many APIs just use 400 for both — pick a convention and be consistent.

## Consistency Rules

The principle matters more than specific shapes.

- Every endpoint returns the same envelope. Don't mix `{ data }` and `{ result }` and bare arrays.
- Errors always use the same shape. Don't return `{ error: "string" }` from one endpoint and `{ error: { code, message } }` from another.
- Paginated collections always include the same meta fields.
- Content-Type is always `application/json` for JSON APIs.
- Null vs absent: pick one. Either omit fields that are null, or include them as `null`. Be consistent.

## RPC Considerations

How this applies to RPC frameworks (tRPC, oRPC, etc.):

- Return values become the `data` field automatically.
- Error handling maps to HTTP status codes via error classes (e.g., `ORPCError('NOT_FOUND')` maps to 404).
- The framework handles envelope wrapping — you define the shape, the framework serializes it.
- OpenAPI generation uses these conventions to produce accurate API specs.
- Even in RPC mode (not REST), consistent error shapes help client-side error handling.

## Best Practices

- Wrap everything in `{ data }` or `{ error }` — never return bare arrays or primitives at the top level.
- Use machine-readable error codes, not just HTTP status codes. Multiple errors can share the same status (two different 400s need different `code` values).
- Include `total` in collection responses even when using cursor pagination — clients need it for "showing 1-20 of 150" UI.
- Don't invent status codes. Use standard ones. If none fits, 400 or 500 with a descriptive error code is better than a custom status.
- Return created/updated resources in the response body. Don't make clients fetch again after POST/PATCH.
- Pagination metadata shape should match what @context/blocks/construct/pagination.md defines.
- See @context/blocks/construct/rest-resources.md for URL conventions.
