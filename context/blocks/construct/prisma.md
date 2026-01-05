---
depends: []
tags: [database]
---

# Prisma

Type-safe database ORM with auto-generated client. Prisma 7 features a pure TypeScript engine (90% smaller than previous Rust-based versions).

## Requirements

- **Node.js:** 20.19+ (recommended 22.x)
- **TypeScript:** 5.4+ (recommended 5.9.x)
- **ESM:** Prisma 7 ships as ES module

```json
// package.json
{ "type": "module" }
```

```json
// tsconfig.json (minimum)
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2023"
  }
}
```

## Setup

```bash
install prisma @prisma/adapter-pg pg
```

**Driver adapters (required in v7):**

| Database   | Adapter Package                   | Driver Package   |
| ---------- | --------------------------------- | ---------------- |
| PostgreSQL | `@prisma/adapter-pg`              | `pg`             |
| SQLite     | `@prisma/adapter-better-sqlite3`  | `better-sqlite3` |

**prisma.config.ts** (required at project root):

Remember to load env variables in command.

```typescript
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

## Schema Definition

**prisma/schema.prisma:**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

**Key v7 changes:**

- Generator: `prisma-client` (not `prisma-client-js`)
- `output` is required
- No `url` in datasource (moved to prisma.config.ts)

## Client Instantiation

```typescript
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import config from "@/config"

const adapter = new PrismaPg({ connectionString: config.db.url });
export const prisma = new PrismaClient({ adapter });
```

**Singleton pattern (for development hot reload):**

```typescript
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import config from "@/config"

const createClient = () => {
  const adapter = new PrismaPg({ connectionString: config.db.url });
  return new PrismaClient({ adapter });
};

declare const globalThis: { prisma?: ReturnType<typeof createClient> } & typeof global;

export const prisma = globalThis.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
```

## CRUD Operations

```typescript
// Create
const user = await prisma.user.create({
  data: { email: "alice@example.com", name: "Alice" },
});

// Read
const users = await prisma.user.findMany({
  where: { email: { contains: "@example.com" } },
  include: { posts: true },
});

const user = await prisma.user.findUnique({
  where: { email: "alice@example.com" },
});

const user = await prisma.user.findUniqueOrThrow({
  where: { id: 1 },
});

// Update
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: "Alice Updated" },
});

// Delete
await prisma.user.delete({ where: { id: 1 } });

// Upsert
const user = await prisma.user.upsert({
  where: { email: "alice@example.com" },
  update: { name: "Alice" },
  create: { email: "alice@example.com", name: "Alice" },
});

// Select specific fields
const emails = await prisma.user.findMany({
  select: { email: true, name: true },
});
```

## Relations

**One-to-many:**

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  author   User @relation(fields: [authorId], references: [id])
  authorId Int
}
```

**Many-to-many (implicit):**

```prisma
model Post {
  id         Int        @id @default(autoincrement())
  categories Category[]
}

model Category {
  id    Int    @id @default(autoincrement())
  posts Post[]
}
```

**Many-to-many (explicit with join table):**

```prisma
model Post {
  id         Int                @id @default(autoincrement())
  categories CategoriesOnPosts[]
}

model Category {
  id    Int                @id @default(autoincrement())
  posts CategoriesOnPosts[]
}

model CategoriesOnPosts {
  post       Post     @relation(fields: [postId], references: [id])
  postId     Int
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int

  @@id([postId, categoryId])
}
```

**Querying relations:**

```typescript
// Include related records
const userWithPosts = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true },
});

// Nested create
const user = await prisma.user.create({
  data: {
    email: "bob@example.com",
    posts: {
      create: [{ title: "Post 1" }, { title: "Post 2" }],
    },
  },
  include: { posts: true },
});
```

## Transactions

**Interactive transactions:**

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: "alice@example.com" },
  });

  await tx.post.create({
    data: { title: "First post", authorId: user.id },
  });

  // Rolls back everything if any operation fails
});
```

**Sequential operations:**

```typescript
const [users, posts] = await prisma.$transaction([
  prisma.user.findMany(),
  prisma.post.findMany(),
]);
```

## Type Utilities

```typescript
import { Prisma } from "./generated/prisma/client";
import type { User, Post } from "./generated/prisma/client";

// Type for query result with includes
type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true };
}>;

// Type-safe select/include objects (use satisfies in v7)
const userSelect = {
  id: true,
  email: true,
  name: true,
} satisfies Prisma.UserSelect;

const postInclude = {
  author: true,
} satisfies Prisma.PostInclude;

// Input types
type UserCreateInput = Prisma.UserCreateInput;
type UserUpdateInput = Prisma.UserUpdateInput;
```

## Error Handling

```typescript
import { Prisma } from "./generated/prisma/client";

try {
  await prisma.user.create({
    data: { email: "existing@example.com" },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      console.log("Unique constraint violation");
    }
  }
  throw error;
}
```

**Common error codes:**

| Code  | Meaning                    | Common Cause           |
| ----- | -------------------------- | ---------------------- |
| P2002 | Unique constraint violated | Duplicate value        |
| P2025 | Record not found           | Invalid ID in update   |
| P2003 | Foreign key failed         | Invalid relation ID    |
| P2014 | Relation violation         | Required relation null |

## Client Extensions

Replaces `$use` middleware (removed in v7):

```typescript
const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        console.log("Query:", args);
        return query(args);
      },
    },
  },
});

// Add computed fields
const xprisma = prisma.$extends({
  result: {
    user: {
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`;
        },
      },
    },
  },
});
```

## Migrations

```bash
# Development (creates migration + applies)
npx prisma migrate dev --name init

# Production (applies pending migrations)
npx prisma migrate deploy

# Reset database (dangerous - drops all data)
npx prisma migrate reset
```

## CLI Commands

```bash
# Generate client (required after schema changes in v7)
npx prisma generate

# Push schema without migration (prototyping)
npx prisma db push

# Introspect existing database
npx prisma db pull

# Visual database editor
npx prisma studio

# Seed database
npx prisma db seed
```

**v7 behavior changes:**

- `migrate dev` no longer auto-runs `generate`
- `migrate dev` no longer auto-runs seed
- `db push` no longer auto-generates client

## Best Practices

**DO:**

- Use driver adapters (required in v7)
- Specify `output` in generator block
- Use `satisfies` for type narrowing (replaces `Prisma.validator`)
- Run `prisma generate` after schema changes
- Use interactive transactions for multi-step operations
- Use `findUniqueOrThrow` when record must exist

**DON'T:**

- Put database URL in schema.prisma (use prisma.config.ts in v7)
- Use `prisma-client-js` generator (use `prisma-client`)
- Forget to run `prisma generate` after `migrate dev`
- Create multiple PrismaClient instances (use singleton)
- Catch and swallow Prisma errors without handling
- Use `$use` middleware (removed in v7, use Client Extensions)

## Limitations

**MongoDB:** Not yet supported in v7. Continue using Prisma 6.x for MongoDB projects.

**Mapped enums:** Enums with `@map` now return mapped values in TypeScript:

```prisma
enum Status {
  PENDING @map("pending")
}
```

In v7, queries return `"pending"` (mapped value), not `"PENDING"` (schema name).

**Connection pools:** Driver adapters use different defaults than Prisma 6. The `pg` driver has no connection timeout by default (v6 used 5s). Configure explicitly if needed.
