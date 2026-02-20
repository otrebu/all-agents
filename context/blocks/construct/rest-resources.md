---
depends: []
tags: []
---

# REST Resource Conventions

URL design conventions for REST APIs. Applies whether you hand-craft routes or generate them from procedure trees (e.g., oRPC, tRPC) — the procedure structure determines the URL structure.

## Core Rules

- Plural nouns for collections: `/users`, `/projects`, `/invoices` (not `/user`, `/getUsers`)
- Resources are nouns, HTTP methods are verbs: `GET /users` not `GET /getUsers`
- IDs in path segments: `/users/123`, `/projects/456`
- Consistent casing: kebab-case for multi-word paths (`/line-items`, not `/lineItems`)

## Resource Nesting

**Nest when the parent is required context for identification. Flatten when the child has a globally unique ID.**

- If a resource has a globally unique ID (e.g., UUID), it can be accessed flat: `/projects/456`. Nesting is optional context.
- If a resource is scoped (member #1 in team A ≠ member #1 in team B), you need parent context and nesting is necessary.

| Approach | URL | Use when |
|----------|-----|----------|
| Nested | `/users/123/projects` | Projects scoped to a user, need parent context to identify |
| Flat | `/projects?userId=123` | Projects have globally unique IDs, user is just a filter |
| Deep nested | `/orgs/1/teams/2/members` | Each level is required context (natural hierarchy) |

**Avoid flattening just to reduce depth.** `/members?teamId=2&orgId=1` loses the hierarchical relationship and forces the client to know multiple IDs that aren't filters — they're identity context. If the hierarchy is real, express it in the URL.

**Do flatten when nesting is artificial.** If members have UUIDs and you'd want `/members/789` to work regardless of team, nesting adds no value.

## Path Params vs Query Params

- **Path params:** identify a specific resource (`/users/123`). Required, part of the resource identity.
- **Query params:** filter, sort, paginate, or modify the representation (`/users?status=active&sort=name`). Optional, don't change which resource you're addressing.

Rule: if removing the param makes the URL point to a different resource, it's a path param. If removing it just changes the view of the same resource, it's a query param.

| Param type | Purpose | Example | Required? |
|------------|---------|---------|-----------|
| Path | Resource identity | `/users/123` | Yes |
| Query | Filter/sort/page | `?status=active` | No |
| Query | Representation | `?fields=name,email` | No |

## Standard Operations

```
GET    /users          List users (with query params for filter/sort/page)
POST   /users          Create a user
GET    /users/123      Get a specific user
PUT    /users/123      Replace a user (full update)
PATCH  /users/123      Partial update a user
DELETE /users/123      Delete a user
```

PUT vs PATCH — PUT replaces the entire resource, PATCH updates specific fields. In practice, most APIs only need PATCH for updates.

## Procedure Trees to REST URLs

Your procedure tree structure maps directly to URL paths:

```
router.users.list            GET    /users
router.users.get             GET    /users/{id}
router.users.create          POST   /users
router.users.update          PATCH  /users/{id}
router.users.projects.list   GET    /users/{id}/projects
```

Same nesting principles apply: nest when parent context is needed for identification. The procedure name IS the URL — design it as if you're designing the REST API.

Even in RPC-first APIs, good URL structure matters for OpenAPI generation, debugging, and log readability.

## Naming Gotchas

| Mistake | Correction | Why |
|---------|-----------|-----|
| `/getUsers` | `/users` | Don't put verbs in URLs |
| `/user` | `/users` | Always plural |
| `/users/123/delete` | `DELETE /users/123` | Action in method, not URL |
| `/api/v1/users` | Fine as-is | Versioning in path is acceptable, keep to one level |
| `/users/123/profile` | Fine as-is | Sub-resources that are conceptually part of the parent |

## Best Practices

- Plural nouns, always. No exceptions. `/users`, not `/user`.
- Nest for identification context, flatten when child has a globally unique ID.
- kebab-case for multi-word paths: `/line-items`, not `/lineItems` or `/line_items`.
- Use query params for anything optional (filters, sorting, pagination, field selection).
- Version in URL path if needed (`/v1/users`), not in headers (simpler to use and debug).
- Design procedure trees with REST URLs in mind — the tree IS the API surface.
