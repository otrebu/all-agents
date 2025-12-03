# oRPC

Type-safe RPC + OpenAPI. Define procedures once, expose as RPC or REST.

## Install

**Server:**

```
@orpc/server         # Core: os, RPCHandler, middleware
@orpc/openapi        # OpenAPIHandler, OpenAPIGenerator
zod                  # or any standard-schema (valibot, arktype)
```

**Client:**

```
@orpc/client         # createORPCClient, RPCLink
@orpc/tanstack-query # TanStack Query integration
```

## RPC vs OpenAPI: The Key Concept

Same procedure definition works with **both** handlers:

| | RPCHandler | OpenAPIHandler |
|---|---|---|
| **Protocol** | oRPC binary/JSON | REST (HTTP methods + paths) |
| **Requires `.route()`** | No | Yes |
| **Client calls** | `orpc.planet.find({ id: 1 })` | `GET /planets/1` |
| **Best for** | Type-safe clients | Third-party / public APIs |

**`.route()` is additive** - adding it enables OpenAPI without breaking RPC:

```typescript
// Works with RPCHandler only
const findPlanet = os
  .input(z.object({ id: z.number() }))
  .handler(async ({ input }) => db.planets.find(input.id))

// Works with BOTH RPCHandler AND OpenAPIHandler
const findPlanet = os
  .route({ method: 'GET', path: '/planets/{id}' })  // ← adds OpenAPI support
  .input(z.object({ id: z.coerce.number() }))       // ← z.coerce for URL params
  .output(PlanetSchema)                              // ← enables spec generation
  .handler(async ({ input }) => db.planets.find(input.id))
```

## Defining Procedures

```typescript
import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'

const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
})

// List with pagination
export const listPlanets = os
  .route({ method: 'GET', path: '/planets' })
  .input(z.object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.number().int().min(0).default(0),
  }))
  .output(z.array(PlanetSchema))
  .handler(async ({ input }) => {
    return db.planets.findMany({
      take: input.limit,
      skip: input.cursor,
    })
  })

// Find by ID
export const findPlanet = os
  .route({ method: 'GET', path: '/planets/{id}' })
  .input(z.object({ id: z.coerce.number().int().min(1) }))
  .output(PlanetSchema)
  .handler(async ({ input }) => {
    const planet = await db.planets.find(input.id)
    if (!planet) throw new ORPCError('NOT_FOUND')
    return planet
  })

// Create (protected)
export const createPlanet = os
  .$context<{ headers: Headers }>()
  .use(requireAuth)  // see Middleware section
  .route({ method: 'POST', path: '/planets' })
  .input(PlanetSchema.omit({ id: true }))
  .output(PlanetSchema)
  .handler(async ({ input, context }) => {
    return db.planets.create({ ...input, createdBy: context.user.id })
  })
```

## Router

Plain nested objects:

```typescript
export const router = {
  planet: {
    list: listPlanets,
    find: findPlanet,
    create: createPlanet,
  },
  // Add more namespaces...
}
```

### Lazy Loading

For code splitting:

```typescript
import { lazy } from '@orpc/server'

export const router = {
  planet: lazy(() => import('./planet')),
  user: lazy(() => import('./user')),
}
```

## Middleware & Context

### Auth Middleware

```typescript
import { ORPCError, os } from '@orpc/server'

const requireAuth = os
  .$context<{ headers: Headers }>()  // Depends on headers being available
  .middleware(async ({ context, next }) => {
    const token = context.headers.get('authorization')?.split(' ')[1]
    const user = await verifyToken(token)

    if (!user) {
      throw new ORPCError('UNAUTHORIZED')
    }

    return next({ context: { user } })  // Inject user into context
  })

// Use it
const createPlanet = os
  .$context<{ headers: Headers }>()
  .use(requireAuth)
  .handler(async ({ context }) => {
    // context.user is now available and typed
  })
```

### Context Types

**Initial Context** - must pass when handling request:

```typescript
const base = os.$context<{ headers: Headers, env: { DB_URL: string } }>()

// When handling
handler.handle(req, res, {
  context: { headers: req.headers, env: process.env }
})
```

**Execution Context** - injected by middleware at runtime:

```typescript
const base = os.use(async ({ next }) => {
  return next({ context: { db: await getDbConnection() } })
})
// No need to pass db when handling
```

### Built-in Middleware

```typescript
import { onError, onStart, onSuccess, onFinish } from '@orpc/server'

const tracedProcedure = os
  .use(onStart(() => console.log('Starting...')))
  .use(onSuccess((result) => console.log('Success:', result)))
  .use(onError((error) => console.error('Failed:', error)))
  .use(onFinish(() => console.log('Done')))
```

## Server Handlers

### Same Router, Different Handlers

```typescript
import { createServer } from 'node:http'
import { RPCHandler } from '@orpc/server/node'
import { OpenAPIHandler } from '@orpc/openapi/node'
import { CORSPlugin } from '@orpc/server/plugins'

// RPC: for type-safe clients
const rpcHandler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
})

// OpenAPI: for REST clients
const openAPIHandler = new OpenAPIHandler(router, {
  plugins: [new CORSPlugin()],
})

const server = createServer(async (req, res) => {
  // Route /rpc/* to RPC handler, everything else to OpenAPI
  if (req.url?.startsWith('/rpc')) {
    const result = await rpcHandler.handle(req, res, {
      context: { headers: req.headers }
    })
    if (!result.matched) {
      res.statusCode = 404
      res.end('Procedure not found')
    }
  } else {
    const result = await openAPIHandler.handle(req, res, {
      context: { headers: req.headers }
    })
    if (!result.matched) {
      res.statusCode = 404
      res.end('Route not found')
    }
  }
})

server.listen(3000)
```

Now same procedures accessible via:
- **RPC**: `POST /rpc` with oRPC protocol → `orpc.planet.find({ id: 1 })`
- **REST**: `GET /planets/1` → standard HTTP

## Client

### Basic Client

```typescript
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    Authorization: `Bearer ${getToken()}`,
  }),
})

export const orpc: RouterClient<typeof router> = createORPCClient(link)

// Full type safety
const planets = await orpc.planet.list({ limit: 10 })
const planet = await orpc.planet.find({ id: 1 })
const created = await orpc.planet.create({ name: 'Mars' })
```

### TanStack Query

```typescript
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

export const orpc = createTanstackQueryUtils(client)

// In React components
const { data: planets } = useQuery(orpc.planet.list.queryOptions({ limit: 10 }))
const { data: planet } = useQuery(orpc.planet.find.queryOptions({ id: 1 }))

const createMutation = useMutation(orpc.planet.create.mutationOptions())
await createMutation.mutateAsync({ name: 'Mars' })
```

## Error Handling

```typescript
import { ORPCError, os } from '@orpc/server'

// Simple errors
throw new ORPCError('NOT_FOUND')
throw new ORPCError('BAD_REQUEST', { message: 'Invalid planet name' })

// With typed data (sent to client - never include sensitive info!)
throw new ORPCError('RATE_LIMITED', {
  message: 'Too many requests',
  data: { retryAfter: 60 }
})

// Type-safe errors
const base = os.errors({
  PLANET_EXISTS: {
    message: 'Planet already exists',
    data: z.object({ name: z.string() }),
  },
})

const createPlanet = base.handler(async ({ input, errors }) => {
  if (await db.planets.exists(input.name)) {
    throw errors.PLANET_EXISTS({ data: { name: input.name } })
  }
})
```

## OpenAPI Spec Generation

```typescript
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()]
})

const spec = await generator.generate(router, {
  info: { title: 'Planet API', version: '1.0.0' }
})

// Serve at /openapi.json or use with Swagger UI
```

## Type Utilities

```typescript
import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server'

type Inputs = InferRouterInputs<typeof router>
type Outputs = InferRouterOutputs<typeof router>

type CreatePlanetInput = Inputs['planet']['create']  // { name: string, description?: string }
type PlanetOutput = Outputs['planet']['find']        // { id: number, name: string, ... }
```

## Best Practices

**DO:**

- Add `.route()` if you need OpenAPI/REST access
- Use `.output()` for better TS inference and OpenAPI spec
- Use `z.coerce` for path/query params (strings from URL)
- Use `.$context<T>()` for required dependencies
- Use middleware for auth and runtime context

**DON'T:**

- Put sensitive data in `ORPCError.data` (sent to client!)
- Apply same middleware at router + procedure level (runs twice)
- Forget `.route()` when using OpenAPIHandler
