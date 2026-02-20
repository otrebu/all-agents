---
depends:
  - "@context/blocks/security/openfga.md"
  - "@context/blocks/security/better-auth.md"
  - "@context/blocks/security/authorization.md"
tags: [auth]
---

# Fine-Grained Authorization with OpenFGA [REVIEW]

How to wire BetterAuth (authentication) and OpenFGA (authorization) together. BetterAuth answers "who are you?", OpenFGA answers "can you do this to that resource?"

## References

@context/blocks/security/openfga.md
@context/blocks/security/better-auth.md
@context/blocks/security/authorization.md

---

## Architecture

```
Request → BetterAuth (authenticate) → Extract userId → OpenFGA (authorize) → Handler
```

Two separate systems, two separate concerns:

| System | Responsibility | Data Store |
|--------|---------------|------------|
| BetterAuth | Sessions, tokens, user identity | Auth DB (`user`, `session`, `account`) |
| OpenFGA | Relationship tuples, permission checks | OpenFGA store (PostgreSQL or in-memory) |

They share nothing except the user ID. BetterAuth produces it, OpenFGA consumes it.

---

## OpenFGA Client Setup

Single client instance, initialized at app startup:

```typescript
import { OpenFgaClient } from '@openfga/sdk'

export const fga = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL,       // http://localhost:8080
  storeId: process.env.FGA_STORE_ID,
  authorizationModelId: process.env.FGA_MODEL_ID,
})
```

---

## Middleware Pattern

Authenticate first, then authorize. Two separate middleware steps:

```typescript
// 1. Authentication middleware — resolves session to userId
async function authenticate(req: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) throw new AuthError('Not authenticated')
  return session.user.id
}

// 2. Authorization middleware — checks OpenFGA
async function authorize(
  userId: string,
  relation: string,
  object: string,
): Promise<void> {
  const { allowed } = await fga.check({
    user: `user:${userId}`,
    relation,
    object,
  })
  if (!allowed) throw new AuthError('Forbidden')
}

// Usage in a route handler
async function updateDocument(req: Request) {
  const userId = await authenticate(req)
  await authorize(userId, 'editor', `document:${req.params.id}`)
  // ... handle request
}
```

The pattern is always: `authenticate → get userId → check permission → proceed`.

---

## Writing Tuples on App Events

Tuples must stay in sync with your application data. Write them when state changes, in the same transaction or immediately after:

```typescript
// User creates a document — they become the owner
async function createDocument(userId: string, data: DocumentInput) {
  const doc = await prisma.document.create({ data: { ...data, createdById: userId } })

  await fga.write({
    writes: [{ user: `user:${userId}`, relation: 'owner', object: `document:${doc.id}` }],
  })

  return doc
}

// User is added to a team
async function addTeamMember(teamId: string, userId: string) {
  await prisma.teamMember.create({ data: { teamId, userId } })

  await fga.write({
    writes: [{ user: `user:${userId}`, relation: 'member', object: `team:${teamId}` }],
  })
}

// User is removed from a team
async function removeTeamMember(teamId: string, userId: string) {
  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } })

  await fga.write({
    deletes: [{ user: `user:${userId}`, relation: 'member', object: `team:${teamId}` }],
  })
}
```

---

## Model Design

Match your OpenFGA model to your app's domain:

```
model
  schema 1.1

type user

type team
  relations
    define member: [user]
    define admin: [user]

type document
  relations
    define owner: [user]
    define parent_team: [team]
    define editor: [user, team#member] or owner
    define viewer: [user, team#member] or editor
```

This gives you: owner can edit and view, team members can edit and view, and you can grant individual user access on top.

---

## Listing Accessible Resources

For "show me everything I can see" queries:

```typescript
async function listUserDocuments(userId: string) {
  const { objects } = await fga.listObjects({
    user: `user:${userId}`,
    relation: 'viewer',
    type: 'document',
  })
  // objects = ['document:abc', 'document:def', ...]
  const ids = objects.map((o) => o.replace('document:', ''))
  return prisma.document.findMany({ where: { id: { in: ids } } })
}
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `FGA_API_URL` | OpenFGA server URL (`http://localhost:8080`) |
| `FGA_STORE_ID` | OpenFGA store identifier |
| `FGA_MODEL_ID` | Authorization model version ID |

---

## Gotchas

- **Tuple sync is your responsibility.** OpenFGA has no hooks into your DB. If you create a resource without writing the tuple, the permission check will deny access.
- **No transactions across systems.** Prisma write + OpenFGA write are not atomic. If the tuple write fails, you have a resource with no permissions. Handle this with retry or compensating deletes.
- **User ID format matters.** OpenFGA expects `user:abc123`. BetterAuth returns bare IDs. Always prefix when calling OpenFGA.
- **Max 100 tuples per write.** Batch large operations (e.g., bulk team imports) into chunks.
- **listObjects can be slow** with large tuple sets. Use it for UI listings, not for authorization checks. Use `check` for authorization.
- **Keep the model simple.** Start with direct relations. Add computed relations (union, traversal) only when the access pattern requires it.
