---
depends:
  - "@context/blocks/security/zanzibar.md"
tags: [auth]
---

# OpenFGA

**Quick reference:** Open-source Zanzibar implementation (CNCF Sandbox). Fine-grained authorization as a service. Define a model (types + relations), store relationship tuples, run Check/ListObjects queries at runtime.

## Setup

Docker for local dev:

```bash
docker run --rm -p 8080:8080 -p 3000:3000 openfga/openfga run
```

- API: `http://localhost:8080`
- Playground: `http://localhost:3000/playground`
- Default datastore is in-memory (ephemeral). Use PostgreSQL for persistence in production.
- Playground also available at https://play.fga.dev for testing models without local setup.

## Install

Packages needed:

- `@openfga/sdk` -- TypeScript SDK
- Note: `@auth0/fga` is deprecated. Use `@openfga/sdk` only.

## Model DSL

Schema 1.1 (current standard):

```
model
  schema 1.1

type user

type organization
  relations
    define member: [user]
    define admin: [user]

type document
  relations
    define owner: [user]
    define editor: [user, organization#member]
    define viewer: [user, organization#member] or editor or owner
```

DSL operators:

- `or` -- union
- `and` -- intersection
- `but not` -- exclusion
- `[user]` -- direct assignment
- `[user:*]` -- public access (all users)
- `[organization#member]` -- userset
- `viewer from parent` -- traverse relation to another object

See @context/blocks/security/zanzibar.md for full concept explanation.

## TypeScript SDK

Core operations:

```typescript
import { OpenFgaClient } from '@openfga/sdk'

const fga = new OpenFgaClient({
  apiUrl: 'http://localhost:8080',
  storeId: process.env.FGA_STORE_ID,
  authorizationModelId: process.env.FGA_MODEL_ID,
})

// Write tuples
await fga.write({
  writes: [
    { user: 'user:alice', relation: 'editor', object: 'document:readme' },
    { user: 'user:bob', relation: 'viewer', object: 'document:readme' },
  ],
})

// Check permission
const { allowed } = await fga.check({
  user: 'user:alice',
  relation: 'viewer',
  object: 'document:readme',
})
// allowed = true (alice is editor, editors are viewers)

// List accessible objects
const { objects } = await fga.listObjects({
  user: 'user:alice',
  relation: 'viewer',
  type: 'document',
})
// objects = ['document:readme', ...]

// Delete tuples
await fga.write({
  deletes: [
    { user: 'user:bob', relation: 'viewer', object: 'document:readme' },
  ],
})
```

## CLI

Model and tuple management:

```bash
# Create store and write model
fga store create --model model.fga

# Write/update model
fga model write --file model.fga

# Write tuples
fga tuple write user:alice editor document:readme
fga tuple write --file tuples.yaml           # bulk import

# Query
fga query check user:alice viewer document:readme
fga query list-objects user:alice viewer document

# Test model assertions
fga model test --tests tests.fga.yaml
```

CLI reads `FGA_STORE_ID` and `FGA_API_URL` from env vars.

## Gotchas

- Max 100 tuples per write request (writes + deletes combined).
- Schema 1.0 is deprecated. Always use `schema 1.1`.
- `@auth0/fga` npm package is deprecated. Use `@openfga/sdk`.
- Check resolves computed relations. Reading raw tuples does not. Use Check for authorization, Read for debugging.
- The playground is for development only. Disable port 3000 in production.
- Write tuples when your app state changes (user joins team -> write tuple). Keep tuples in sync with your application data.
