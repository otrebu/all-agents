---
depends: []
---

# MSW (Mock Service Worker)

API mocking at the network level. Same handlers work in browser & Node.js.

## Quick Start

```bash
# install (dev)
msw

# browser: copy service worker to public dir
npx msw init ./public --save
```

## Handlers (v2 API)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // GET
  http.get("/api/users", () => {
    return HttpResponse.json([
      { id: 1, name: "John" },
      { id: 2, name: "Jane" },
    ]);
  }),

  // POST with body
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  }),

  // Path params
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, name: "User" });
  }),

  // Error response
  http.get("/api/error", () => {
    return HttpResponse.json({ message: "Not found" }, { status: 404 });
  }),

  // Network error
  http.get("/api/network-error", () => {
    return HttpResponse.error();
  }),

  // Delay
  http.get("/api/slow", async () => {
    await delay(2000);
    return HttpResponse.json({ data: "slow" });
  }),
];
```

## Node.js Setup (Tests)

```typescript
// src/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts (or jest.setup.ts)
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Add to vitest.config.ts:

```typescript
test: {
  setupFiles: ["./vitest.setup.ts"],
}
```

## Browser Setup (Dev)

```typescript
// src/mocks/browser.ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

```typescript
// src/main.tsx
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import("./mocks/browser");
    await worker.start();
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
```

## Override Handlers in Tests

```typescript
import { server } from "./mocks/server";
import { http, HttpResponse } from "msw";

test("handles error state", async () => {
  server.use(
    http.get("/api/users", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    })
  );

  // ... test error handling
});
```

## GraphQL

```typescript
import { graphql, HttpResponse } from "msw";

export const handlers = [
  graphql.query("GetUser", ({ variables }) => {
    return HttpResponse.json({
      data: { user: { id: variables.id, name: "John" } },
    });
  }),

  graphql.mutation("CreateUser", ({ variables }) => {
    return HttpResponse.json({
      data: { createUser: { id: "new", ...variables } },
    });
  }),
];
```

## When to Use

| Scenario              | MSW  | Alternative          |
| --------------------- | ---- | -------------------- |
| Component tests       | Yes  | -                    |
| Integration tests     | Yes  | -                    |
| E2E tests             | Yes  | Playwright intercept |
| Dev without backend   | Yes  | -                    |
| Unit tests (no fetch) | No   | vi.mock              |

MSW = realistic API mocking, same handlers everywhere, network-level interception.
