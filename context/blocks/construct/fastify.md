---
depends: []
---

# Fastify

High-performance, low-overhead web framework for Node.js.

## Setup

Install fastify
Install dev dependencies: @types/node typescript

## Basic Server

```typescript
import Fastify from "fastify";

const server = Fastify({ logger: true });

server.get("/", async function () {
  return { hello: "world" };
});

server.listen({ port: 3000 }, function (err) {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
```

## Routes

```typescript
// Method shortcuts
server.get("/users", handler);
server.post("/users", handler);
server.put("/users/:id", handler);
server.delete("/users/:id", handler);

// Route with options
server.route({
  method: "GET",
  url: "/users/:id",
  schema: {
    params: { type: "object", properties: { id: { type: "string" } } },
    response: {
      200: { type: "object", properties: { name: { type: "string" } } },
    },
  },
  handler: async function (request, reply) {
    const { id } = request.params;
    return { name: "User " + id };
  },
});

// Async handlers (return value = response body)
server.get("/async", async function (request, reply) {
  const data = await fetchData();
  return data; // Automatically serialized to JSON
});

// Reply helpers
server.get("/manual", async function (request, reply) {
  reply.code(201);
  reply.header("X-Custom", "value");
  return { created: true };
});
```

## Plugins

Fastify's encapsulation model - plugins don't leak to siblings.

```typescript
// src/plugins/db.ts
import fp from "fastify-plugin";
import { createDb } from "@app/db";

async function dbPlugin(server, options) {
  const db = await createDb(options.connectionString);
  server.decorate("db", db);
}

export default fp(dbPlugin, { name: "db" });

// src/server.ts
import dbPlugin from "@plugins/db";

server.register(dbPlugin, { connectionString: process.env.DATABASE_URL });

// Usage in routes
server.get("/users", async function (request, reply) {
  return server.db.query("SELECT * FROM users");
});
```

### Plugin Registration

```typescript
// Register with prefix
server.register(userRoutes, { prefix: "/api/users" });

// Register with options
server.register(plugin, { option1: "value" });

// Await registration (for tests)
await server.ready();
```

## Hooks

```typescript
// Request lifecycle hooks
server.addHook("onRequest", async function (request, reply) {
  // Before routing
});

server.addHook("preHandler", async function (request, reply) {
  // Before handler, after validation
  request.user = await authenticate(request);
});

server.addHook("onSend", async function (request, reply, payload) {
  // Before sending response
  return payload;
});

server.addHook("onResponse", async function (request, reply) {
  // After response sent (logging, metrics)
});

server.addHook("onError", async function (request, reply, error) {
  // On error
});

// Server lifecycle hooks
server.addHook("onReady", async function () {
  // Server ready
});

server.addHook("onClose", async function () {
  // Server closing (cleanup)
});
```

## Decorators

```typescript
// Decorate fastify instance
server.decorate("config", { apiKey: process.env.API_KEY });

// Decorate request (use hook to set per-request values)
server.decorateRequest("user", null);
server.addHook("preHandler", async function (request) {
  request.user = await getUser(request.headers.authorization);
});

// Decorate reply (use hook pattern for per-request state)
server.decorateReply("requestId", null);
server.addHook("onRequest", async function (request, reply) {
  reply.requestId = crypto.randomUUID();
});
```

## Error Handling

```typescript
// Custom error handler
server.setErrorHandler(function (error, request, reply) {
  request.log.error(error);

  if (error.validation) {
    // Validation error
    reply
      .code(400)
      .send({ error: "Validation failed", details: error.validation });
    return;
  }

  // Custom error classes
  if (error.name === "NotFoundError") {
    reply.code(404).send({ error: error.message });
    return;
  }

  // Default
  reply.code(500).send({ error: "Internal server error" });
});

// Throw HTTP errors
import { createError } from "@fastify/error";

const NotFoundError = createError("NOT_FOUND", "Resource not found", 404);
throw new NotFoundError();
```

## Serialization

```typescript
// Custom serializer
server.route({
  method: "GET",
  url: "/users",
  schema: {
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            // email omitted = not serialized
          },
        },
      },
    },
  },
  handler: async function () {
    return users;
  },
});
```

## Logging

```typescript
const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// Log in handlers
server.get("/", async function (request, reply) {
  request.log.info({ userId: "123" }, "Processing request");
  return { ok: true };
});
```

## TypeScript Support

```typescript
import Fastify, { FastifyRequest, FastifyReply } from "fastify";

// Typed request
interface GetUserParams {
  id: string;
}

server.get<{ Params: GetUserParams }>("/users/:id", async function (request) {
  const id = request.params.id; // Typed as string
  return { id };
});

// Typed body
interface CreateUserBody {
  name: string;
  email: string;
}

server.post<{ Body: CreateUserBody }>("/users", async function (request) {
  const { name, email } = request.body; // Typed
  return { name, email };
});
```

## Best Practices

**DO:**

- Use `server` as the Fastify instance variable name
- Use `createServer()` as the factory function name
- Use plugins for modular code organization
- Use `fp()` (fastify-plugin) to break encapsulation when needed
- Use async handlers (cleaner than callbacks)
- Use schema validation for input/output
- Use decorators for shared state

**DON'T:**

- Use `app` or `fastify` as variable names (use `server`)
- Use `buildApp()` or `initApp()` (use `createServer()`)
- Mutate `request` or `reply` outside hooks
- Use `reply.send()` with async handlers (just return)
- Register routes after `listen()` is called
- Block the event loop in handlers
