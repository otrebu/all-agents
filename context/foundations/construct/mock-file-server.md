---
depends:
  - "@context/blocks/construct/fastify.md"
  - "@context/blocks/construct/fastify-binary.md"
tags: []
---

# File Server Mocking for Development

Simulate file servers with directory hierarchies and binary responses. Use when testing code that fetches files via HTTP paths rather than REST endpoints.

## References

@context/blocks/construct/fastify.md
@context/blocks/construct/fastify-binary.md
@context/foundations/test/mock-server-local.md

---

## When to Mock File Servers

**Use file server mocks for:**

- Testing file download logic (PDFs, images, archives)
- Simulating Apache/nginx directory structures
- URL-to-filesystem mapping scenarios
- Testing path traversal and hierarchy navigation
- Browser-based file fetching in E2E tests

**Use REST mocks instead for:**

- JSON API responses with structured data
- Resource CRUD operations (POST, PUT, DELETE)
- Authentication and authorization flows
- Query parameters and request bodies

**Key distinction:** File servers expose directory hierarchies via URL paths (`/root/level1/file.pdf`). REST APIs expose resources via endpoints (`/api/files/:id`).

---

## Directory Hierarchy Simulation

Map URL paths to fixture files. Use discriminated unions for path resolution.

```typescript
// src/routes/files.ts
import { FastifyInstance } from "fastify";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

const FIXTURES_ROOT = join(__dirname, "../fixtures/file-server");

// Prevents path traversal attacks in URL patterns
function sanitizePath(urlPath: string): string {
  const normalized = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  return normalized.split(sep).filter(Boolean).join(sep);
}

type PathResult =
  | { type: "file"; buffer: Buffer; mimeType: string }
  | { type: "directory"; entries: string[] }
  | { type: "not_found" };

function resolvePath(urlPath: string): PathResult {
  const safePath = sanitizePath(urlPath);
  const fsPath = join(FIXTURES_ROOT, safePath);

  if (!existsSync(fsPath)) {
    return { type: "not_found" };
  }

  const stats = statSync(fsPath);

  if (stats.isDirectory()) {
    const entries = readdirSync(fsPath);
    return { type: "directory", entries };
  }

  const buffer = readFileSync(fsPath);
  return { type: "file", buffer, mimeType: getMimeType(fsPath) };
}

export async function fileRoutes(server: FastifyInstance) {
  server.get("/*", async (request, reply) => {
    const urlPath = request.params["*"] as string;
    const result = resolvePath(urlPath);

    switch (result.type) {
      case "not_found":
        return reply.code(404).send({ error: "File not found" });

      case "directory":
        reply.type("text/html");
        return reply.send(renderDirectoryListing(urlPath, result.entries));

      case "file":
        reply.type(result.mimeType);
        return reply.send(result.buffer);
    }
  });
}
```

---

## Directory Listings

Generate HTML indexes similar to Apache autoindex.

```typescript
function renderDirectoryListing(path: string, entries: string[]): string {
  const rows = entries
    .map((e) => `<tr><td><a href="${path}/${e}">${e}</a></td></tr>`)
    .join("\n");

  return `<!DOCTYPE html>
<html><head><title>Index of ${path}</title></head>
<body><h1>Index of ${path}</h1><table>${rows}</table></body>
</html>`;
}

function getMimeType(filePath: string): string {
  const mimes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    zip: "application/zip",
  };
  const ext = filePath.split(".").pop()?.toLowerCase();
  return mimes[ext ?? ""] ?? "application/octet-stream";
}
```

---

## Scenario-Based Routing

Use filename patterns to trigger test scenarios. Decisions at the edge via discriminated unions.

```typescript
type ScenarioResult =
  | { type: "error"; statusCode: number }
  | { type: "delay"; delayMs: number }
  | { type: "normal" };

function parseScenario(urlPath: string): ScenarioResult {
  const filename = urlPath.split("/").pop() ?? "";

  if (filename.startsWith("404-")) {
    return { type: "error", statusCode: 404 };
  }
  if (filename.startsWith("500-")) {
    return { type: "error", statusCode: 500 };
  }
  if (filename.startsWith("slow-")) {
    return { type: "delay", delayMs: 5000 };
  }
  return { type: "normal" };
}

export async function scenarioRoutes(server: FastifyInstance) {
  server.get("/scenarios/*", async (request, reply) => {
    const urlPath = request.params["*"] as string;
    const scenario = parseScenario(urlPath);

    switch (scenario.type) {
      case "error":
        return reply.code(scenario.statusCode).send({ error: "Scenario error" });
      case "delay":
        await new Promise((resolve) => setTimeout(resolve, scenario.delayMs));
        break;
      case "normal":
        break;
      default:
        const _exhaustive: never = scenario;
        return _exhaustive;
    }

    const result = resolvePath(urlPath);
    if (result.type === "file") {
      reply.type(result.mimeType);
      return reply.send(result.buffer);
    }

    return reply.code(404).send({ error: "Not found" });
  });
}
```

---

## Fixture Organization

Mirror real file server hierarchies. Use filename prefixes for scenario routing.

```
apps/mock-file-server/
└── src/
    ├── routes/
    │   ├── files.ts
    │   └── scenarios.ts
    └── fixtures/file-server/
        ├── root/level1/level2/deep.pdf
        └── scenarios/
            ├── 404-missing.pdf
            ├── 500-error.pdf
            └── slow-download.pdf
```

**Fixture naming patterns:**

| Prefix  | Behavior              |
| ------- | --------------------- |
| `404-*` | Returns 404           |
| `500-*` | Returns 500           |
| `slow-*` | Delays response 5s    |
| Default | Returns fixture file  |

---

## Server Setup

See @context/foundations/test/mock-server-local.md for server factory pattern.

```typescript
// src/server.ts
export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: true });

  server.get("/health", async () => ({ status: "ok" }));
  await server.register(scenarioRoutes);
  await server.register(fileRoutes);

  return server;
}
```

---

## Testing

Test path resolution in isolation using discriminated union type narrowing.

```typescript
import { describe, it, expect } from "vitest";
import { resolvePath } from "@app/routes/files";

describe("resolvePath", () => {
  it("returns file result for valid file path", () => {
    const result = resolvePath("root/level1/document.pdf");

    expect(result.type).toBe("file");
    if (result.type === "file") {
      expect(result.mimeType).toBe("application/pdf");
      expect(result.buffer).toBeInstanceOf(Buffer);
    }
  });

  it("returns directory result for directories", () => {
    const result = resolvePath("root/level1");
    expect(result.type).toBe("directory");
  });

  it("returns not_found for missing paths", () => {
    const result = resolvePath("nonexistent/path");
    expect(result.type).toBe("not_found");
  });
});
```

---

## When to Use

- Directory hierarchy navigation and nested paths
- Binary file downloads via URL paths (PDFs, images, archives)
- Testing path traversal and filesystem mapping
- Simulating Apache/nginx directory listings

## When NOT to Use

- JSON REST APIs → @context/foundations/test/mock-server-local.md
- Browser-based mocking → @context/foundations/test/mock-api-msw.md
- S3/cloud storage → AWS SDK mocks or LocalStack
