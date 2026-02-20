---
depends:
  - "@context/blocks/security/authorization.md"
tags: [auth]
---

# Google Zanzibar (ReBAC)

**Quick reference:** Relationship-based access control. Permissions defined by relationships between users and resources, not roles. "User X is editor of Document Y" rather than "User X has editor role." Based on Google's Zanzibar paper (2019). Implementations: OpenFGA, SpiceDB, Ory Keto.

## Relationship Tuples

The core data model. A tuple is a fact: "this subject has this relation with this object."

Format: `object#relation@subject`

```
document:readme#viewer@user:alice        // Alice is a viewer of document:readme
group:eng#member@user:bob                // Bob is a member of group:eng
document:readme#viewer@group:eng#member  // All eng members are viewers of readme
folder:plans#parent@document:readme      // folder:plans is parent of document:readme
```

The schema defines what tuples are valid. Tuples are the runtime data -- the schema is the policy, tuples are the facts.

## Types and Relations

The schema, using OpenFGA DSL:

```
model
  schema 1.1

type user

type group
  relations
    define member: [user]

type document
  relations
    define owner: [user]
    define editor: [user, group#member]
    define viewer: [user, group#member] or editor or owner
```

Key concepts:

- **Types** define object categories (user, group, document, folder).
- **Relations** define valid connections between types.
- **Type restrictions** (the `[user, group#member]` part) constrain what subjects can appear in a relation.
- Types with no relations (like `user`) are leaf entities -- they're subjects, not objects with their own permissions.

## Computed Relations

The power of the model. Relations can be derived, not just stored.

**Union:** `define viewer: [user] or editor or owner` -- viewers include direct viewers + editors + owners.

**Traversal (tuple_to_userset):** `define viewer: viewer from parent` -- viewers of the parent folder are viewers of this document.

Example -- indirect access through group membership:

```
// Stored tuples:
group:eng#member@user:alice
document:roadmap#editor@group:eng#member

// Resolved: Alice can edit document:roadmap
// Path: document:roadmap → editor → group:eng#member → user:alice
```

Example -- inherited access through folder hierarchy:

```
// Schema:
type folder
  relations
    define viewer: [user]

type document
  relations
    define parent: [folder]
    define viewer: [user] or viewer from parent

// Stored tuples:
folder:plans#viewer@user:bob
document:spec#parent@folder:plans

// Resolved: Bob can view document:spec (inherited from folder)
```

## Core Operations

What you call at runtime:

| Operation | Question | Use |
|---|---|---|
| **Check** | "Does user X have relation Y with object Z?" | Request-path authorization. The main operation. |
| **ListObjects** | "Which documents can user X view?" | Filtering: show only accessible resources in a list. |
| **ListUsers** | "Who can edit document Z?" | Sharing UI: show who has access. |
| **Expand** | "Show me the full permission tree for document Z#viewer" | Debugging: "why does this user have access?" |

Note: Check is resolved, not just a tuple lookup. It follows computed relations, group memberships, and hierarchy traversals.

## Zanzibar vs RBAC

| | RBAC | Zanzibar/ReBAC |
|---|---|---|
| Question | "Does user's role have this permission?" | "Does user have this relation with this object?" |
| Scope | Global (role-level) | Per-resource |
| Data model | Roles + permissions tables | Relationship tuples (graph) |
| Sharing | Not natural (need per-object grants) | Natural (add a tuple) |
| Hierarchy | Optional (role inheritance) | Core feature (folder → document traversal) |

You can model RBAC inside Zanzibar, but Zanzibar goes further with per-resource, relationship-based access.

## Gotchas

- **Separate auth datastore.** Zanzibar-style systems require you to maintain relationship tuples in a separate service, synced with your application data. Real operational overhead.
- **Read ≠ Check.** Reading raw tuples doesn't resolve computed relations. Alice might have access through a group, but a raw tuple query won't show it. Always use Check for authorization decisions.
- **No "grant on all objects."** You can't write one tuple to make someone admin of all documents. Model it via hierarchy (admin → org → folders → documents) or use OpenFGA's `user:*` wildcard.
- **Schema is the policy.** Changing who can do what means either writing new tuples (granting access) or changing the schema (changing the rules). Keep the schema stable; tuples are the dynamic part.
- **Consistency model.** The original Zanzibar paper uses "new enemy" semantics -- permission revocations propagate before new access checks. Understand your implementation's consistency guarantees.
- **Tuple lifecycle.** Tuples must be created and deleted in sync with your application data. If you delete a team, you must delete all tuples referencing that team. Missing cleanup leads to phantom access or orphan data.

## Best Practices

- Start with the schema. Model your types, relations, and permission rules before writing any code.
- Use Check on every request. Cache results with short TTL if needed.
- Write tuples when things happen in your app (user joins team → write tuple). Delete tuples when relationships end.
- Keep the schema shallow. Deep traversals (5+ levels) are slow to resolve.
- Test your schema with the playground before deploying (OpenFGA has one, SpiceDB has one).
- Batch tuple writes when possible. Creating a project might require 5-10 tuples (owner, default viewers, parent relationships).
- See @context/blocks/security/authorization.md for the RBAC vs Zanzibar decision framework.
- See @context/blocks/security/openfga.md for OpenFGA setup and TypeScript SDK usage.
