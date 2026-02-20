---
depends:
  - "@context/blocks/construct/hierarchical-data.md"
  - "@context/blocks/construct/prisma.md"
  - "@context/blocks/construct/postgres.md"
tags: [database]
---

# Hierarchical Data with Prisma

Implementing tree structures in PostgreSQL via Prisma. Adjacency list as the default pattern, recursive CTEs via `$queryRaw` for deep traversals.

## References

- @context/blocks/construct/hierarchical-data.md — pattern concepts (adjacency list, materialized path, closure table, decision matrix)
- @context/blocks/construct/prisma.md — Prisma ORM reference
- @context/blocks/construct/postgres.md — PostgreSQL reference

## Prisma Schema

Adjacency list — the default pattern:

```prisma
model Category {
  id        String     @id @default(uuid())
  name      String
  parentId  String?    @map("parent_id")
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  depth     Int        @default(0)

  @@index([parentId])
  @@map("categories")
}
```

- Self-referential relation with named relation `"CategoryTree"`
- `parentId` nullable (root nodes have no parent)
- `depth` column for easy depth queries without recursion
- Index on `parentId` — Prisma doesn't auto-create FK indexes on PostgreSQL

## Basic Operations

```typescript
// Get direct children
const children = await prisma.category.findMany({
  where: { parentId: parentId },
  orderBy: { name: 'asc' },
})

// Get parent (one level up)
const withParent = await prisma.category.findUnique({
  where: { id: categoryId },
  include: { parent: true },
})

// Get children with nested children (2 levels)
const tree = await prisma.category.findMany({
  where: { parentId: null }, // roots
  include: {
    children: {
      include: { children: true },
    },
  },
})
```

Prisma's `include` only works for fixed-depth nesting. For arbitrary-depth trees, use recursive CTEs.

## Recursive Queries

Use `$queryRaw` for full subtree and ancestor traversals:

```typescript
// Full subtree from a node (all descendants)
const subtree = await prisma.$queryRaw<Category[]>`
  WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE id = ${nodeId}
    UNION ALL
    SELECT c.id, c.name, c.parent_id, t.depth + 1
    FROM categories c
    JOIN tree t ON c.parent_id = t.id
    WHERE t.depth < 20
  )
  SELECT * FROM tree ORDER BY depth, name
`

// Ancestors (breadcrumb path)
const ancestors = await prisma.$queryRaw<Category[]>`
  WITH RECURSIVE ancestors AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE id = ${nodeId}
    UNION ALL
    SELECT c.id, c.name, c.parent_id, a.depth + 1
    FROM categories c
    JOIN ancestors a ON c.id = a.parent_id
  )
  SELECT * FROM ancestors ORDER BY depth DESC
`
```

The `WHERE t.depth < 20` guard prevents runaway queries. Adjust the limit to match your max tree depth.

## Depth Management

Maintain the `depth` column on write:

```typescript
async function createChild(parentId: string, name: string) {
  const parent = await prisma.category.findUniqueOrThrow({
    where: { id: parentId },
    select: { depth: true },
  })

  const MAX_DEPTH = 10
  if (parent.depth >= MAX_DEPTH) {
    throw new Error(`Max depth ${MAX_DEPTH} exceeded`)
  }

  return prisma.category.create({
    data: {
      name,
      parentId,
      depth: parent.depth + 1,
    },
  })
}

// Create root node
const root = await prisma.category.create({
  data: { name: 'Root', depth: 0 },
})
```

## Seeding

```typescript
// seed.ts — create tree structure
async function seedCategories() {
  const electronics = await prisma.category.create({
    data: { name: 'Electronics', depth: 0 },
  })

  const phones = await prisma.category.create({
    data: { name: 'Phones', parentId: electronics.id, depth: 1 },
  })

  await prisma.category.createMany({
    data: [
      { name: 'iPhone', parentId: phones.id, depth: 2 },
      { name: 'Android', parentId: phones.id, depth: 2 },
    ],
  })
}
```

## Best Practices

- Default to adjacency list + `$queryRaw` recursive CTEs. Covers most use cases.
- Keep a `depth` column for easy depth filtering without recursion.
- Always guard recursive CTEs with a depth limit (`WHERE depth < N`).
- Index `parentId` — Prisma doesn't auto-create FK indexes on PostgreSQL.
- Use `include: { children: true }` for shallow trees (1-2 levels). Use `$queryRaw` for deep/variable-depth trees.
- For materialized path or closure table patterns with Prisma, see @context/blocks/construct/hierarchical-data.md for the SQL patterns and implement via `$queryRaw`.
