---
depends: []
---

# TypeScript + pnpm + Node REST API Stack

Fastify + Zod for type-safe, self-documenting REST APIs with OpenAPI generation.

## Layers

| Layer | Reference |
|-------|-----------|
| Runtime | @primitives/tools/PNPM.md, @primitives/tools/NODE.md, @primitives/tools/TYPESCRIPT.md |
| Framework | @primitives/tools/FASTIFY.md |
| Validation | @primitives/tools/ZOD.md |
| Logging | @primitives/patterns/logging-services.md |
| Testing | @primitives/patterns/api-testing.md |
| DX | @foundations/code-standards.md |
| DevOps | @primitives/tools/semantic-release.md |
| Workflow | @workflows/COMMIT.md, @workflows/DEV_LIFECYCLE.md |

## Quick Start

```bash
mkdir myapi && cd myapi
pnpm init

# Core
pnpm add fastify @fastify/swagger @fastify/swagger-ui zod fastify-type-provider-zod

# Logging
pnpm add pino pino-pretty

# Dev
pnpm add -D typescript @types/node tsx vitest

# DX
pnpm add -D eslint prettier uba-eslint-config
```

## When to Use

- REST APIs with auto-generated OpenAPI docs
- Type-safe request/response validation
- Node LTS / enterprise requirements
- Microservices needing fast cold starts

## When NOT to Use

- Simple scripts (use Bun)
- GraphQL (consider Apollo/Yoga)
- Static sites or SSR (use Next.js/Remix)

## Project Structure

```
myapi/
├── src/
│   ├── main.ts          # Entry point
│   ├── server.ts        # Server factory (for testing)
│   ├── routes/          # Route handlers
│   │   ├── users.ts
│   │   └── health.ts
│   ├── schemas/         # Zod schemas
│   │   └── user.ts
│   ├── plugins/         # Fastify plugins
│   │   └── db.ts
│   └── lib/             # Shared utilities
├── tests/
│   └── api/
├── package.json
├── tsconfig.json
└── eslint.config.js
```

## Commands

```bash
pnpm dev                    # tsx watch src/main.ts
pnpm build                  # tsc --build
pnpm start                  # node dist/main.js
pnpm test                   # vitest run
pnpm typecheck              # tsc --noEmit
pnpm lint                   # eslint .
```

## Minimal API with Zod Validation

```typescript
// src/server.ts
import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";

export async function createServer() {
  const server = Fastify({ logger: true });

  // Zod integration
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // OpenAPI
  await server.register(swagger, {
    openapi: {
      info: { title: "My API", version: "1.0.0" },
    },
  });
  await server.register(swaggerUI, { routePrefix: "/docs" });

  // Routes with Zod
  server.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/users",
    schema: {
      body: z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
      response: {
        201: z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      const { name, email } = request.body; // Fully typed
      reply.code(201);
      return { id: crypto.randomUUID(), name, email };
    },
  });

  return server;
}

// src/main.ts
import { createServer } from "./server";

const server = await createServer();
await server.listen({ port: 3000 });
```

## Shared Schemas

```typescript
// src/schemas/user.ts
import { z } from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.date(),
});

export const createUserSchema = userSchema.omit({ id: true, createdAt: true });
export const updateUserSchema = createUserSchema.partial();

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
```

## Routes with Type Provider

```typescript
// src/routes/users.ts
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { userSchema, createUserSchema } from "../schemas/user";
import { z } from "zod";

const usersRoutes: FastifyPluginAsyncZod = async (server) => {
  server.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: z.object({
        limit: z.coerce.number().default(10),
        offset: z.coerce.number().default(0),
      }),
      response: { 200: z.array(userSchema) },
    },
    handler: async (request) => {
      const { limit, offset } = request.query;
      return server.db.users.findMany({ take: limit, skip: offset });
    },
  });

  server.route({
    method: "POST",
    url: "/",
    schema: {
      body: createUserSchema,
      response: { 201: userSchema },
    },
    handler: async (request, reply) => {
      const user = await server.db.users.create({ data: request.body });
      reply.code(201);
      return user;
    },
  });
};

export default usersRoutes;
```

## Error Handling

```typescript
// src/lib/errors.ts
import { createError } from "@fastify/error";

export const NotFoundError = createError("NOT_FOUND", "%s not found", 404);
export const ConflictError = createError("CONFLICT", "%s already exists", 409);

// Usage
throw new NotFoundError("User");

// src/plugins/error-handler.ts
import fp from "fastify-plugin";

export default fp(async (server) => {
  server.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.validation) {
      reply.code(400).send({
        error: "Validation Error",
        details: error.validation,
      });
      return;
    }

    // Custom errors (from @fastify/error)
    if (error.statusCode) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
      return;
    }

    // Fallback
    reply.code(500).send({ error: "Internal Server Error" });
  });
});
```

## Authentication Hook

```typescript
// src/plugins/auth.ts
import fp from "fastify-plugin";

export default fp(async (server) => {
  server.decorateRequest("user", null);

  server.addHook("preHandler", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.slice(7);
    try {
      request.user = await verifyToken(token);
    } catch {
      reply.code(401).send({ error: "Invalid token" });
    }
  });
});

// Apply to specific routes
server.register(authPlugin);
server.register(protectedRoutes); // These routes require auth
```

## Testing

```typescript
// tests/api/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "../../src/server";

describe("Users API", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.ready();
  });

  afterAll(() => server.close());

  it("POST /users validates input", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/users",
      payload: { name: "", email: "invalid" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /users creates user", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/users",
      payload: { name: "John", email: "john@example.com" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ name: "John" });
  });
});
```

## package.json

```json
{
  "name": "myapi",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc --build",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## ESLint: Disable no-console

```typescript
// eslint.config.js
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig, { rules: { "no-console": "off" } }];
```
