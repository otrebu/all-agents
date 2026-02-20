---
depends: []
tags: [database]
---

# Entity Ownership

Ownership relationships between entities: who owns what, what happens on delete, single vs multi-owner, tenant scoping.

## Ownership Models

### Single Owner (Direct FK)

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_projects_owner ON projects(owner_id);
```

One entity owns another. Simplest model. Use when ownership is 1:1 or many:1.

### Multi-Owner (Join Table)

```sql
CREATE TABLE project_members (
  project_id INTEGER NOT NULL REFERENCES projects(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

Multiple entities share ownership with roles. Use when ownership is many:many or when you need roles/permissions per relationship.

### Tenant-Scoped

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL
);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
```

Every row belongs to a tenant. Organizational boundary, not individual ownership. Use for multi-tenant SaaS.

### Decision Flow

Is it 1:many? --> Direct FK. Many:many or needs roles? --> Join table. Multi-tenant? --> Add `tenant_id` to everything.

## FK Cascade Strategies

| Strategy  | On parent delete     | Use when                              | Example                |
| --------- | -------------------- | ------------------------------------- | ---------------------- |
| CASCADE   | Children deleted     | Children meaningless without parent   | order --> line_items   |
| SET NULL  | FK set to NULL       | Association is optional               | task.assigned_to       |
| RESTRICT  | Delete blocked       | Must handle children explicitly first | user with active projects |

```sql
-- CASCADE: line items die with the order
ALTER TABLE line_items
  ADD CONSTRAINT fk_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- SET NULL: unassign tasks when user is deleted
ALTER TABLE tasks
  ADD CONSTRAINT fk_assignee
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- RESTRICT: block deletion of users who own projects
ALTER TABLE projects
  ADD CONSTRAINT fk_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
```

## Direct FK vs Join Table

- **Direct FK:** simpler queries, less schema, fine for single-owner. `project.owner_id --> users.id`
- **Join table:** required for multi-owner, supports roles/metadata on the relationship, more complex queries. `project_members(project_id, user_id, role, joined_at)`
- **Rule of thumb:** start with direct FK. Migrate to join table when you need multiple owners OR metadata on the relationship.

## Tenant Scoping

Every table gets a `tenant_id` column. Enforce at application layer (middleware adds `WHERE tenant_id = ?` to every query) or database layer (PostgreSQL Row Level Security).

```sql
-- RLS example
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Gotchas:**

- Scope JOIN tables too. A join table without `tenant_id` can leak data across tenants.
- Shared/global entities (e.g., roles, plans) are tenant-agnostic. Use a nullable `tenant_id` or a separate table.

## Orphan Prevention

- **RESTRICT** prevents orphans by blocking parent deletion.
- **CASCADE** prevents orphans by deleting children (but may delete too much).
- **Application-level:** check for dependents before delete, offer reassignment UI.
- **Soft delete complication:** soft-deleted parents still "exist" in FK terms but are logically gone. Treat soft delete as archival (keep FKs valid) or add application-level orphan checks.

## Soft Delete Implications

- Soft-deleted parent + CASCADE: CASCADE won't fire (row isn't actually deleted). Children become logically orphaned.
- **Pattern:** when soft-deleting a parent, soft-delete children in application code (cascade in app layer, not DB).
- **Alternative:** use RESTRICT + application-level cascade. Check for dependents, soft-delete them, then soft-delete the parent.

## Best Practices

- Default to RESTRICT for safety; opt into CASCADE only for truly dependent data.
- Always index FK columns (not automatic in PostgreSQL).
- Start with direct FK, migrate to join table when requirements demand it.
- In multi-tenant apps, add `tenant_id` to EVERY table from day one. Retrofitting is painful.
- If using soft delete, implement cascade logic in application code, don't rely on DB CASCADE.
- Document your cascade strategy per relationship -- a schema diagram showing CASCADE/RESTRICT/SET NULL per FK is invaluable.
