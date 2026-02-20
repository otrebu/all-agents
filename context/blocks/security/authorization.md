---
depends: []
tags: [auth]
---

# Authorization

**Quick reference:** Authorization (authz) = what can you do. Authentication (authn) = who are you. This doc covers authz concepts: RBAC for coarse-grained role checks, Zanzibar/ReBAC for fine-grained per-resource permissions.

## AuthN vs AuthZ

- **Authentication (AuthN):** Verifying identity. "Who are you?" Handled by login, sessions, tokens. See @context/blocks/security/better-auth.md.
- **Authorization (AuthZ):** Verifying permissions. "What can you do?" Happens after authentication. This is what this doc covers.

They're separate concerns. You can change your auth provider without changing your authorization model, and vice versa.

## Two Models

### RBAC (Role-Based Access Control)

- Users are assigned roles. Roles have permissions. Check: "does this user's role include this permission?"
- Example: Admin role can delete users. Editor role can update content. Viewer role can only read.
- Coarse-grained: permissions are global, not per-resource. An admin can delete ANY user, not just specific ones.
- Simple to implement, simple to reason about.
- Good for: feature-level access (who can see the billing page), API route guards, admin vs regular user distinctions.

### Zanzibar / ReBAC (Relationship-Based Access Control)

- Permissions are defined by relationships between users and resources. Check: "does user X have relationship Y with resource Z?"
- Example: User is an editor of Document 123. User is a member of Team 456. Team 456 owns Project 789 -> User can access Project 789.
- Fine-grained: permissions are per-resource. User A can edit Document 1 but not Document 2.
- Relationships can be indirect (through groups, teams, org hierarchy).
- More complex to implement, requires a dedicated authorization service.
- Good for: document sharing (Google Docs model), per-project access, any "who has access to THIS specific resource" check.

## Decision Framework

```
Do you need per-resource permissions?
|-- NO --> RBAC is sufficient
|          "Can this user access the billing feature?"
|          "Is this user an admin?"
|
+-- YES --> Zanzibar/ReBAC
            "Can this user edit THIS document?"
            "Can this user view THIS project?"
```

**Common pattern: layer both.** Use RBAC for coarse-grained feature access (route guards, menu visibility) and Zanzibar for fine-grained resource access (per-document, per-project permissions). They complement each other:

- RBAC check first: "Is the user allowed to access the documents feature at all?"
- Zanzibar check second: "Is the user allowed to edit THIS specific document?"

## Comparison

| | RBAC | Zanzibar/ReBAC |
|---|---|---|
| Granularity | Global (role-level) | Per-resource |
| Check pattern | "Has role X?" or "Has permission Y?" | "Has relationship Y with resource Z?" |
| Complexity | Low -- roles table + assignments | Higher -- relationship tuples, graph traversal |
| Implementation | DB tables (see rbac.md) | Dedicated service (see openfga.md) |
| Scales to | Hundreds of permissions | Millions of relationships |
| Best for | Feature gates, route guards | Document sharing, project access, team permissions |

## Best Practices

- Keep authN and authZ separate. Don't mix session management with permission checks.
- Start with RBAC. Add Zanzibar only when you need per-resource permissions.
- Check permissions server-side, always. Client-side checks are for UX (hiding buttons), not security.
- Centralize authorization logic. Don't scatter permission checks across random handlers.
- See @context/blocks/security/rbac.md for RBAC schema patterns.
- See @context/blocks/security/zanzibar.md for the Zanzibar relationship model.
- See @context/blocks/security/openfga.md for OpenFGA as the implementation.
