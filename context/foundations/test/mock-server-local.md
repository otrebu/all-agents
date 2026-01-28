---
depends:
  - "@context/blocks/construct/fastify.md"
  - "@context/foundations/test/test-integration-api.md"
---

# Local HTTP Mock Servers

Custom mock servers for development and testing. Simulate external services with binary responses and scenario-based behavior.

## References

@context/blocks/construct/fastify.md
@context/foundations/test/test-integration-api.md

---

## When to Use Local Mock Servers

**Use custom mock servers for:**

- Binary file responses (PDFs, images, ZIP files)
- Simulating external service APIs during development
- Testing error scenarios via URL patterns
- Shared dev environment (team can run same mock)
- Contract testing without external dependencies

**Use MSW instead for:**

- Browser-based API mocking (component tests)
- JSON API responses in frontend tests
- Intercepting fetch/XHR in React components

**Use Prism/OpenAPI instead for:**

- Auto-generating mocks from OpenAPI specs
- Contract testing with formal API documentation

---

## Server Factory Pattern

Use factory function for testability and port configuration.

```typescript
// apps/mock-billing-service/src/server.ts
import Fastify, { FastifyInstance } from "fastify";
import { billRoutes } from "@app/routes/bills";

export interface ServerOptions {
  logLevel?: string;
}

export async function createServer(
  options: ServerOptions = {}
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: options.logLevel ?? "info",
    },
  });

  // Health check bypasses auth - Docker healthcheck needs unauthenticated endpoint
  server.get("/health", async () => ({ status: "ok" }));

  await server.register(billRoutes, { prefix: "/api" });

  return server;
}

// apps/mock-billing-service/src/main.ts
import { createServer } from "@app/server";

const portNumber = Number(process.env.PORT) || 4000;
const server = await createServer();

await server.listen({ port: portNumber, host: "0.0.0.0" });
console.log(`Mock billing service running on port ${portNumber}`);
```

---

## Port Conventions

Use 4000-4999 range for local mock servers.

| Port | Service                  |
| ---- | ------------------------ |
| 4000 | Mock billing service     |
| 4001 | Mock payment gateway     |
| 4002 | Mock PDF generator       |
| 3000 | Real application API     |
| 5173 | Vite dev server          |

**Why separate ports:**

- Avoid conflicts with real services
- Clear visual separation in logs
- Easy to route via proxy in docker-compose

---

## Health Check Endpoints

Always provide unauthenticated health check.

```typescript
server.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Optional: detailed health with dependencies
server.get("/health/detail", async () => {
  return {
    status: "ok",
    fixtures: {
      pdfs: fixtureCount("pdfs"),
      images: fixtureCount("images"),
    },
  };
});
```

**Why:**

- Docker healthcheck can poll without auth
- Quick verification server is running
- No sensitive data exposed

---

## Fixture Organization

Store binary files in fixtures directory with scenario-based structure.

```
apps/mock-billing-service/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   └── bills.ts
│   └── fixtures/
│       ├── pdfs/
│       │   ├── bill-valid.pdf
│       │   ├── bill-404.pdf       # triggers 404 by name
│       │   ├── bill-500.pdf       # triggers 500 by name
│       │   └── bill-malformed.pdf
│       └── images/
│           ├── logo.png
│           └── signature.jpg
└── package.json
```

**Fixture helpers:**

```typescript
// src/fixtures/loader.ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = join(__dirname, "../fixtures");

export function loadFixture(category: string, filename: string): Buffer {
  const path = join(FIXTURES_DIR, category, filename);

  if (!existsSync(path)) {
    throw new Error(`Fixture not found: ${category}/${filename}`);
  }

  return readFileSync(path);
}

export function fixtureExists(category: string, filename: string): boolean {
  const path = join(FIXTURES_DIR, category, filename);
  return existsSync(path);
}
```

---

## Scenario-Based Routing

Use URL patterns to trigger different responses.

```typescript
// src/routes/bills.ts
import { FastifyInstance, FastifyRequest } from "fastify";
import { loadFixture } from "@app/fixtures/loader";

// Simulates network latency for timeout scenario testing
const TIMEOUT_DELAY_MS = 5000;

interface BillParams {
  billRef: string;
}

// Scenario resolver - decisions at the edge, not buried in route handlers
type ScenarioResult =
  | { type: "error"; statusCode: number; message: string }
  | { type: "delay"; delayMs: number }
  | { type: "success" };

function resolveScenario(billRef: string): ScenarioResult {
  if (billRef.startsWith("404")) {
    return { type: "error", statusCode: 404, message: "Bill not found" };
  }
  if (billRef.startsWith("500")) {
    return { type: "error", statusCode: 500, message: "Internal server error" };
  }
  if (billRef.startsWith("timeout")) {
    return { type: "delay", delayMs: TIMEOUT_DELAY_MS };
  }
  return { type: "success" };
}

export async function billRoutes(server: FastifyInstance) {
  server.get<{ Params: BillParams }>(
    "/bills/:billRef/pdf",
    async (request, reply) => {
      const { billRef } = request.params;
      const scenario = resolveScenario(billRef);

      if (scenario.type === "error") {
        return reply.code(scenario.statusCode).send({ error: scenario.message });
      }

      if (scenario.type === "delay") {
        await new Promise((resolve) => setTimeout(resolve, scenario.delayMs));
      }

      const pdf = loadFixture("pdfs", "bill-valid.pdf");
      reply.type("application/pdf");
      return reply.send(pdf);
    }
  );

  server.get<{ Params: BillParams }>(
    "/bills/:billRef/image",
    async (request, reply) => {
      const { billRef } = request.params;
      const scenario = resolveScenario(billRef);

      if (scenario.type === "error") {
        return reply.code(scenario.statusCode).send({ error: scenario.message });
      }

      const image = loadFixture("images", "logo.png");
      reply.type("image/png");
      return reply.send(image);
    }
  );
}
```

**Scenario patterns:**

| Bill Ref Pattern | Response                   |
| ---------------- | -------------------------- |
| `404*`           | 404 Not Found              |
| `500*`           | 500 Internal Server Error  |
| `timeout*`       | Delayed response (5s)      |
| `malformed*`     | Returns corrupted PDF      |
| Default          | Returns valid fixture file |

---

## Testing with Mock Server

Use server factory in integration tests.

```typescript
// tests/integration/bills.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "@app/server";

describe("Bill PDF endpoint", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("returns PDF for valid bill ref", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/bills/BILL-123/pdf",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.rawPayload).toBeInstanceOf(Buffer);
  });

  it("returns 404 for bill ref starting with 404", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/bills/404-NOTFOUND/pdf",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Bill not found" });
  });

  it("returns 500 for bill ref starting with 500", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/bills/500-ERROR/pdf",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal server error" });
  });
});
```

---

## Package Structure

```
apps/mock-{service-name}/
├── package.json          # Name: @app/mock-{service-name}
├── tsconfig.json         # Extends workspace tsconfig
├── src/
│   ├── main.ts           # Entry point (starts server)
│   ├── server.ts         # Factory function
│   ├── routes/           # Route handlers
│   │   └── {domain}.ts
│   └── fixtures/         # Binary files
│       ├── pdfs/
│       ├── images/
│       └── loader.ts     # Fixture helpers
└── tests/
    └── integration/      # Integration tests
```

**package.json:**

```json
{
  "name": "@app/mock-billing-service",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "start": "tsx src/main.ts",
    "test": "vitest"
  },
  "dependencies": {
    "fastify": "^5.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

---

## Development Workflow

**Start mock server:**

```bash
cd apps/mock-billing-service
pnpm dev
```

**Test from application:**

```typescript
// In your application code
const mockServerPort = 4000;
const billPdfUrl = `http://localhost:${mockServerPort}/api/bills/${billRef}/pdf`;
const response = await fetch(billPdfUrl);

if (!response.ok) {
  throw new Error(`Failed to fetch bill PDF: ${response.status}`);
}

const pdfBuffer = await response.arrayBuffer();
```

**Trigger error scenarios:**

```typescript
// 404 scenario
const bill404 = await fetch("http://localhost:4000/api/bills/404-TEST/pdf");

// 500 scenario
const bill500 = await fetch("http://localhost:4000/api/bills/500-TEST/pdf");

// Timeout scenario
const billTimeout = await fetch(
  "http://localhost:4000/api/bills/timeout-TEST/pdf"
);
```

---

## Docker Compose Integration

```yaml
# docker-compose.dev.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      BILLING_SERVICE_URL: http://mock-billing:4000
    depends_on:
      mock-billing:
        condition: service_healthy

  mock-billing:
    build: ./apps/mock-billing-service
    ports:
      - "4000:4000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 5s
      timeout: 3s
      retries: 3
```

---

## When to Use

| Scenario                            | Local Mock Server | Alternative              |
| ----------------------------------- | ----------------- | ------------------------ |
| Binary file responses (PDF, images) | Yes               | -                        |
| Team shared dev environment         | Yes               | -                        |
| External service simulation         | Yes               | -                        |
| Error scenario testing (404, 500)   | Yes               | -                        |
| Integration tests with binaries     | Yes               | -                        |
| JSON API mocking in browser         | No                | MSW                      |
| OpenAPI contract testing            | No                | Prism                    |
| Component-level API mocking         | No                | MSW                      |
| Pure function testing               | No                | Unit tests (Vitest)      |
| E2E with real API                   | No                | Playwright + staging API |

## When NOT to Use

- **Browser-based mocking** → @context/foundations/test/mock-api-msw.md
- **OpenAPI contract validation** → Prism or similar
- **Unit testing pure functions** → @context/foundations/test/test-unit-vitest.md
- **E2E testing** → @context/foundations/test/test-e2e-web-playwright.md
