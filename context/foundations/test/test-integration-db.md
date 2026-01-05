---
depends:
  - "@context/blocks/construct/postgres.md"
tags: [database, testing]
---

# Database Integration Testing

ORM-agnostic patterns for testing with real databases. Works with Prisma, Drizzle, Kysely, or raw SQL.

## Docker Compose Test Setup

Separate test database on different port, RAM-backed for speed:

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:18
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - "5433:5432"  # Different port from dev
    tmpfs:
      - /var/lib/postgresql  # RAM for speed
```

**Connection string:** `postgresql://test:test@localhost:5433/testdb`

## Test Isolation Principles

1. **Fresh state per test** - Reset before each test, not after
2. **No shared state** - Tests must not depend on order
3. **Respect FK constraints** - Delete child tables first
4. **Clean shutdown** - Close connections in afterAll

## Reset/Seed Helper Pattern

Abstract pattern - implement with your ORM:

```typescript
// tests/helpers/db.ts

// Reset: Delete all data respecting foreign keys
export async function resetDb(db: YourDbClient) {
  // Delete in FK-safe order (children first)
  await db.deleteAll("posts");
  await db.deleteAll("users");
}

// Seed: Create consistent test data
export async function seedTestData(db: YourDbClient) {
  return db.create("users", {
    email: "test@example.com",
    name: "Test User",
  });
}
```

## Test Lifecycle Pattern

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";

describe("Database tests", () => {
  let db: YourDbClient;

  beforeAll(async () => {
    db = createDbClient(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await resetDb(db);  // Fresh state each test
  });

  afterAll(async () => {
    await db.disconnect();  // Clean shutdown
  });

  it("creates record", async () => {
    const user = await db.create("users", { email: "new@test.com" });
    expect(user.email).toBe("new@test.com");
  });
});
```

## CI Integration

```yaml
# .github/workflows/test.yml
services:
  postgres:
    image: postgres:18
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb
    ports:
      - 5433:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - run: npm test
    env:
      DATABASE_URL: postgresql://test:test@localhost:5433/testdb
```

## Best Practices

**DO:**
- Use `tmpfs` for RAM-backed test DB
- Reset in `beforeEach`, not `afterEach`
- Disconnect in `afterAll`
- Use separate port (5433) from dev (5432)
- Wait for DB ready in CI (healthcheck)

**DON'T:**
- Share state between tests
- Assume test execution order
- Skip FK constraint order in cleanup
- Leave connections open after tests
