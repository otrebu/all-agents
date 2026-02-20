---
depends:
  - "@context/blocks/construct/postgres.md"
  - "@context/blocks/construct/prisma.md"
  - "@context/foundations/test/test-integration-db.md"
  - "@context/blocks/construct/entity-ownership.md"
tags: [database]
---

# Database Persistence with Prisma

Type-safe database layer for Node.js APIs using Prisma ORM with PostgreSQL.

## References

@context/blocks/construct/postgres.md - Docker setup, connection strings, psql
@context/blocks/construct/prisma.md - Schema, client, CRUD, migrations, transactions
@context/foundations/test/test-integration-db.md - Test DB setup, isolation, lifecycle

## Context Injection Pattern

Inject Prisma into request context for type-safe access in handlers:

```typescript
// src/context.ts
import { prisma } from "@/db/client";

export const createContext = () => ({
  prisma,
});

export type Context = ReturnType<typeof createContext>;
```

## CI/CD Pattern

```yaml
# In deployment script
- run: npx prisma migrate deploy
- run: npx prisma generate
- run: node dist/server.js
```

## Prisma Test Helpers

Implement the patterns from @context/foundations/test/test-integration-db.md with Prisma:

```typescript
// tests/helpers/db.ts
import { prisma } from "@/db/client";

export async function resetDb() {
  // Delete in FK-safe order (children first)
  // See @context/blocks/construct/entity-ownership.md for CASCADE vs SET NULL vs RESTRICT strategies
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedTestData() {
  return prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
    },
  });
}

// Cleanup in afterAll
export async function disconnectDb() {
  await prisma.$disconnect();
}
```

## Service Layer Pattern

```typescript
// src/services/user.ts
import { prisma } from "@/db/client";
import type { User, Prisma } from "@/generated/prisma/client";

export const userService = {
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  async updateEmail(id: number, email: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { email },
    });
  },
};
```

## Best Practices

**DO:**
- Use service layer for business logic
- Inject Prisma via context pattern
- Run `migrate deploy` in CI (not `migrate dev`)

**DON'T:**
- Import Prisma client directly in handlers
- Run `migrate dev` in production
