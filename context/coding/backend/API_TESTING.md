# API Testing

Patterns for testing HTTP APIs. Examples use Fastify's `inject()` but patterns apply to any framework.

## Server Factory Pattern

Separate server construction from startup for testability.

**Pattern:** Export a `createServer()` function that returns a configured server instance.

```typescript
// src/server.ts
import Fastify from "fastify";
import routes from "@app/routes";

export async function createServer(options = {}) {
  const server = Fastify({
    logger: options.logger ?? false,
    ...options,
  });

  await server.register(routes);

  return server;
}

// src/main.ts (entry point)
import { createServer } from "@app/server";

const server = await createServer({ logger: true });
await server.listen({ port: 3000 });
```

Tests create isolated server instances without network:

```typescript
import { createServer } from "@app/server";

const server = await createServer(); // No logger, no server
await server.ready();
```

## Dependency Injection via Factory

**Pattern:** Accept dependencies as factory options, default to real implementations.

```typescript
// src/server.ts
import Fastify from "fastify";
import routes from "@app/routes";
import { createDb } from "@app/db";
import { createEmailService } from "@app/email";

export async function createServer(options = {}) {
  const server = Fastify();

  server.decorate("db", options.db ?? createDb());
  server.decorate("emailService", options.emailService ?? createEmailService());

  await server.register(routes);
  return server;
}
```

Tests inject mocks:

```typescript
import { vi } from "vitest";
import { createServer } from "@app/server";

const mockDb = {
  users: { findAll: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]) },
};

const server = await createServer({ db: mockDb });

it("uses mock db", async () => {
  const response = await server.inject({ method: "GET", url: "/users" });
  expect(mockDb.users.findAll).toHaveBeenCalled();
});
```

## Test Fixtures

**Pattern:** Create reusable seed/clean functions for consistent test state.

```typescript
// tests/fixtures/users.ts
export const testUser = {
  id: "test-id",
  name: "Test User",
  email: "test@example.com",
};

export async function seedUsers(server) {
  await server.db.users.create(testUser);
}

export async function cleanUsers(server) {
  await server.db.users.deleteAll();
}
```

Usage in tests:

```typescript
import { createServer } from "@app/server";
import { testUser, seedUsers, cleanUsers } from "@tests/fixtures/users";

describe("User API", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  beforeEach(async () => {
    await cleanUsers(server);
    await seedUsers(server);
  });

  it("fetches seeded user", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/users/${testUser.id}`,
    });
    expect(response.json().name).toBe(testUser.name);
  });
});
```

## Auth Helpers

**Pattern:** Helper function to get auth headers for protected routes.

```typescript
import { testUser } from "@tests/fixtures/users";

async function getAuthHeaders(server, user = testUser) {
  const response = await server.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: user.email, password: "password" },
  });
  const { token } = response.json();
  return { authorization: `Bearer ${token}` };
}

it("protected route requires auth", async () => {
  const response = await server.inject({
    method: "GET",
    url: "/api/protected",
  });
  expect(response.statusCode).toBe(401);
});

it("protected route works with auth", async () => {
  const headers = await getAuthHeaders(server);
  const response = await server.inject({
    method: "GET",
    url: "/api/protected",
    headers,
  });
  expect(response.statusCode).toBe(200);
});
```

## Fastify inject() Reference

No network overhead - direct function calls.

```typescript
const response = await server.inject({
  method: "POST",
  url: "/api/data",
  headers: {
    authorization: "Bearer token123",
    "content-type": "application/json",
  },
  payload: { key: "value" },
  query: { filter: "active" },
  cookies: { session: "abc123" },
});

// Response helpers
response.statusCode; // 200
response.json(); // Parsed JSON body
response.body; // Raw string body
response.headers; // Response headers
response.cookies; // Parsed cookies
```

## Best Practices

**DO:**
- Use server factory pattern for testability
- Inject mocks via factory options
- Clean state between tests
- Test error cases (400, 401, 404, 500)

**DON'T:**
- Start real server for unit tests
- Share state between test files
- Test implementation details (test behavior)
- Skip testing error paths
