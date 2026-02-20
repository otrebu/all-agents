---
depends: []
tags: [database]
---

# Hierarchical Data in Relational Databases

Tree structures in SQL: categories, org charts, comment threads, menus, permission hierarchies.

## Patterns

### Adjacency List

Each row has a `parent_id` FK pointing to the same table.

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id)
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

**Pros:** Simple schema, trivial inserts/moves (update one row).
**Cons:** Deep reads require recursive CTE; no single query without recursion.
**Best for:** Most applications. Default choice unless you have a specific read-heavy pattern that demands more.

### Materialized Path

Store the full ancestor path as a string column.

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL  -- e.g. '/1/3/7/'
);
CREATE INDEX idx_categories_path ON categories(path text_pattern_ops);
```

Subtree query: `WHERE path LIKE '/1/3/%'`
Breadcrumbs: split the path string.

**Pros:** Fast prefix queries, breadcrumbs are free, depth is `length(path) - length(replace(path, '/', ''))`.
**Cons:** Moving a subtree requires rewriting paths for all descendants. Path length grows with depth.
**Best for:** Read-heavy trees where you need breadcrumbs or prefix filtering (e.g., URL hierarchies, file trees).

### Closure Table

Separate join table storing every ancestor-descendant pair with depth.

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE category_closure (
  ancestor_id INTEGER REFERENCES categories(id),
  descendant_id INTEGER REFERENCES categories(id),
  depth INTEGER NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);
CREATE INDEX idx_closure_desc ON category_closure(descendant_id);
```

Every node has a self-referencing row `(id, id, 0)`. Inserting a child means copying all ancestor rows of the parent with `depth + 1`, plus the self-row.

**Pros:** Fast subtree queries (`WHERE ancestor_id = ?`), fast ancestor queries (`WHERE descendant_id = ?`), depth filtering trivial.
**Cons:** Extra table, write overhead (maintain closure rows on insert/move/delete).
**Best for:** Complex subtree queries with rare structural changes (permissions, taxonomy browsers).

### Nested Sets

Each node stores `lft` and `rgt` integer boundaries. A node's descendants have `lft`/`rgt` values within its range.

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  lft INTEGER NOT NULL,
  rgt INTEGER NOT NULL
);
```

Subtree: `WHERE lft BETWEEN parent.lft AND parent.rgt`

**Pros:** Single query for subtree reads, no recursion needed.
**Cons:** Inserts and moves require renumbering all affected `lft`/`rgt` values. Concurrent writes are painful.
**Best for:** Largely historical. Closure table covers the same use case with less write pain. Avoid for new designs.

## Decision Matrix

| Pattern          | Read perf  | Write perf | Subtree queries | Move nodes | Complexity |
| ---------------- | ---------- | ---------- | --------------- | ---------- | ---------- |
| Adjacency List   | Moderate   | Excellent  | Recursive CTE   | Trivial    | Low        |
| Materialized Path| Good       | Moderate   | LIKE prefix     | Rewrite    | Low        |
| Closure Table    | Excellent  | Moderate   | Direct join     | Rebuild    | Medium     |
| Nested Sets      | Excellent  | Poor       | Range scan      | Renumber   | High       |

## Recursive CTE Pattern

Standard PostgreSQL recursive query for adjacency list traversal:

```sql
WITH RECURSIVE tree AS (
  -- Base case: root nodes
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: children
  SELECT c.id, c.name, c.parent_id, t.depth + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree ORDER BY depth, name;
```

**Subtree from a specific node:**

```sql
WITH RECURSIVE subtree AS (
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = $1  -- starting node

  UNION ALL

  SELECT c.id, c.name, c.parent_id, s.depth + 1
  FROM categories c
  JOIN subtree s ON c.parent_id = s.id
)
SELECT * FROM subtree;
```

**Ancestors of a node (walk up):**

```sql
WITH RECURSIVE ancestors AS (
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = $1

  UNION ALL

  SELECT c.id, c.name, c.parent_id, a.depth + 1
  FROM categories c
  JOIN ancestors a ON c.id = a.parent_id
)
SELECT * FROM ancestors;
```

## Depth Constraints

Unbounded tree depth leads to performance issues and stack-like recursion limits. Enforce limits:

- **Application-level check** (recommended): validate depth before insert. Query the ancestor count or path length and reject if it exceeds the limit.
- **Trigger-based:** database trigger that counts ancestors on INSERT/UPDATE and raises an exception if max depth is exceeded.
- **Materialized path length:** constrain `path` column length (e.g., `VARCHAR(255)` limits practical depth).
- **Recursive CTE guard:** add `WHERE depth < $max_depth` in the recursive term to prevent runaway queries.

```sql
-- Recursive CTE with depth guard
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
  WHERE t.depth < 20  -- hard depth limit
)
SELECT * FROM tree;
```

## Best Practices

- **Default to adjacency list + recursive CTE.** PostgreSQL, MySQL 8+, and SQLite 3.8+ all support `WITH RECURSIVE`. It handles most use cases without extra schema complexity.
- **Add materialized path if you need breadcrumbs** or prefix filtering on top of adjacency list. The two patterns can coexist on the same table.
- **Use closure table for heavy subtree reads** with rare structural changes (e.g., permission trees, org charts that change quarterly).
- **Set max depth constraints in application code**, not just the database. A depth of 10-20 covers most real hierarchies.
- **Always index `parent_id` and `path` columns.** Missing indexes on self-referential FKs is a common oversight.
- **Avoid nested sets for new designs.** The write penalty and concurrency issues outweigh the read benefits now that recursive CTEs are widely supported.
