---
depends:
  - "@context/blocks/test/msw.md"
---

# API Mocking with MSW

Patterns for organizing handlers, testing scenarios, and sharing mocks.

## References

@context/blocks/test/msw.md

---

## Handler Organization

```
src/
└── mocks/
    ├── handlers/
    │   ├── index.ts      # combines all handlers
    │   ├── users.ts      # user-related endpoints
    │   ├── auth.ts       # auth endpoints
    │   └── products.ts   # product endpoints
    ├── data/
    │   └── fixtures.ts   # test data factories
    ├── server.ts         # Node.js setup
    └── browser.ts        # Browser setup
```

---

## Domain Handlers

```typescript
// src/mocks/handlers/users.ts
import { http, HttpResponse } from "msw";
import { createUser } from "../data/fixtures";

export const userHandlers = [
  http.get("/api/users", () => {
    return HttpResponse.json([createUser(), createUser()]);
  }),

  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json(createUser({ id: params.id as string }));
  }),

  http.post("/api/users", async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json(createUser(userData), { status: 201 });
  }),

  http.delete("/api/users/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

```typescript
// src/mocks/handlers/index.ts
import { userHandlers } from "./users";
import { authHandlers } from "./auth";
import { productHandlers } from "./products";

export const handlers = [
  ...userHandlers,
  ...authHandlers,
  ...productHandlers,
];
```

---

## Test Data Factories

```typescript
// src/mocks/data/fixtures.ts
let idCounter = 0;

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: String(++idCounter),
    name: `User ${idCounter}`,
    email: `user${idCounter}@example.com`,
    role: "user",
    ...overrides,
  };
}

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: String(++idCounter),
    name: `Product ${idCounter}`,
    price: 9.99,
    ...overrides,
  };
}
```

---

## Scenario Handlers

```typescript
// src/mocks/handlers/scenarios.ts
import { http, HttpResponse, delay } from "msw";

export const errorScenarios = {
  serverError: http.get("/api/users", () => {
    return HttpResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }),

  notFound: http.get("/api/users/:id", () => {
    return HttpResponse.json({ error: "User not found" }, { status: 404 });
  }),

  unauthorized: http.get("/api/users", () => {
    return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
  }),

  networkError: http.get("/api/users", () => {
    return HttpResponse.error();
  }),

  slowResponse: http.get("/api/users", async () => {
    await delay(3000);
    return HttpResponse.json([]);
  }),
};
```

---

## Using Scenarios in Tests

```typescript
import { test, expect } from "vitest";
import { server } from "../mocks/server";
import { errorScenarios } from "../mocks/handlers/scenarios";
import { render, screen, waitFor } from "@testing-library/react";
import { UserList } from "./UserList";

test("shows error message on server error", async () => {
  server.use(errorScenarios.serverError);

  render(<UserList />);

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent(/error/i);
  });
});

test("shows loading state on slow response", async () => {
  server.use(errorScenarios.slowResponse);

  render(<UserList />);

  expect(screen.getByText("Loading...")).toBeInTheDocument();
});
```

---

## Response Helpers

```typescript
// src/mocks/helpers.ts
import { HttpResponse, delay } from "msw";

export function jsonResponse<T>(data: T, status = 200) {
  return HttpResponse.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return HttpResponse.json({ error: message }, { status });
}

export async function delayedResponse<T>(data: T, delayMs = 1000) {
  await delay(delayMs);
  return HttpResponse.json(data);
}

export function paginatedResponse<T>(
  items: T[],
  page: number,
  perPage: number
) {
  const start = (page - 1) * perPage;
  const paginatedItems = items.slice(start, start + perPage);

  return HttpResponse.json({
    data: paginatedItems,
    meta: {
      page,
      perPage,
      total: items.length,
      totalPages: Math.ceil(items.length / perPage),
    },
  });
}
```

---

## Request Assertions

> **Note:** MSW discourages request assertions - prefer testing behavior over implementation details. Use sparingly.

```typescript
import { http, HttpResponse } from "msw";

test("sends correct request body", async () => {
  let capturedUserData: unknown;

  server.use(
    http.post("/api/users", async ({ request }) => {
      capturedUserData = await request.json();
      return HttpResponse.json({ id: "1" }, { status: 201 });
    })
  );

  await createUser({ name: "John", email: "john@example.com" });

  expect(capturedUserData).toEqual({
    name: "John",
    email: "john@example.com",
  });
});
```

---

## Conditional Responses

```typescript
http.get("/api/users", ({ request }) => {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");

  if (role === "admin") {
    return HttpResponse.json([createUser({ role: "admin" })]);
  }

  return HttpResponse.json([createUser(), createUser()]);
});
```

---

## When to Use

| Scenario              | MSW Mocking | Alternative        |
| --------------------- | ----------- | ------------------ |
| Component + API test  | Yes         | -                  |
| Hook testing          | Yes         | -                  |
| Error state testing   | Yes         | -                  |
| Pure function test    | No          | Direct unit test   |
| E2E with real API     | No          | Playwright         |

## When NOT to Use

- **Real API contract validation** → Use integration tests against real API
- **Pure logic** → @context/foundations/test/test-unit-vitest.md
- **E2E user flows** → @context/foundations/test/test-e2e-web-playwright.md
