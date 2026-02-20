---
depends:
  - "@context/blocks/security/authorization.md"
tags: [auth]
---

# RBAC (Role-Based Access Control)

Database schema patterns and permission check logic for role-based access control. Implements the coarse-grained authorization model described in @context/blocks/security/authorization.md.

## Core Schema

The standard 5-table model (NIST Core RBAC / RBAC0):

```sql
-- Users (your existing users table)

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Permissions: resource + action as separate columns (not a single name string)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,   -- e.g., 'articles', 'users', 'billing'
  action TEXT NOT NULL,     -- e.g., 'read', 'create', 'update', 'delete'
  UNIQUE (resource, action)
);

-- Role-permission assignment (many-to-many)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User-role assignment (many-to-many)
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,   -- optional: prevents privilege creep
  PRIMARY KEY (user_id, role_id)
);
```

Key design decisions:

- **`resource` + `action` as separate columns**, not a single `name` string. Enables queries like "all permissions on users" without string parsing. Convention: `resource:action` string (e.g., `users:delete`) for display/logging.
- **`expires_at` on `user_roles`** -- optional but prevents privilege creep. Schedule periodic reviews.
- **No direct user-to-permission grants.** Always go through roles. Direct grants bypass the model and make auditing impossible at scale.

## Permission Check

The standard query pattern:

```sql
SELECT EXISTS (
  SELECT 1
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = :user_id
    AND p.resource = :resource
    AND p.action = :action
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
) AS allowed;
```

**Application-level pattern:**

- Check permissions, not roles: `user.can('articles:delete')`, not `user.role === 'admin'`. Roles change; permission semantics are stable.
- Cache the resolved permission set per user on login/session creation. Invalidate on any role or permission change.
- Always enforce server-side. Client-side checks (hiding buttons) are UX, not security.

## Role Hierarchy

Optional -- add when needed:

- Start flat (no inheritance) if you have 3-4 simple roles (viewer, editor, admin).
- Add hierarchy when you see permission duplication across roles (admin has all editor permissions + more).
- Simplest approach: `parent_role_id` self-FK on `roles` table (adjacency list).

```sql
ALTER TABLE roles ADD COLUMN parent_role_id UUID REFERENCES roles(id);
```

Permission check with hierarchy (recursive CTE):

```sql
WITH RECURSIVE role_tree AS (
  SELECT role_id FROM user_roles WHERE user_id = :user_id
  UNION ALL
  SELECT r.parent_role_id
  FROM roles r
  JOIN role_tree rt ON r.id = rt.role_id
  WHERE r.parent_role_id IS NOT NULL
)
SELECT EXISTS (
  SELECT 1
  FROM role_permissions rp
  JOIN permissions p ON rp.permission_id = p.id
  WHERE rp.role_id IN (SELECT role_id FROM role_tree)
    AND p.resource = :resource AND p.action = :action
) AS allowed;
```

See @context/blocks/construct/hierarchical-data.md for deeper coverage of tree patterns (closure table if hierarchy gets deep).

## Anti-Patterns

| Anti-pattern | Why it fails |
|---|---|
| Hardcoding role names in business logic | `if (role === 'admin')` scattered through code. Check permissions instead. |
| Direct user-to-permission grants | Bypasses the role model. Auditing becomes impossible. |
| Role-per-user explosion | If you have more roles than users, something is wrong. Roles are reusable organizational units. |
| Single permission name string | `edit_users` doesn't compose. Use `resource:action` columns. |
| No expiry on role assignments | Leads to privilege creep. People accumulate roles and never lose them. |
| Permissions embedded in JWTs | Stale until token expires. Check live or cache with proper invalidation. |

## Best Practices

- Check permissions (`user.can('articles:delete')`), not roles (`user.role === 'admin'`).
- Centralize permission checks in middleware or a policy module. Don't scatter across handlers.
- Cache resolved permissions per user. Invalidate on role/permission changes.
- Start flat (no hierarchy). Add `parent_role_id` when you need inheritance.
- Index all FK columns in join tables -- PostgreSQL does not auto-create these.
- Schedule periodic role reviews to catch privilege creep.
- See @context/blocks/security/authorization.md for the conceptual overview (RBAC vs Zanzibar decision).
