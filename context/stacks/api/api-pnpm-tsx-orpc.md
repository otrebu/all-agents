# oRPC API Stack

Type-safe RPC + REST APIs with oRPC + Zod + OpenAPI.

## construct/ - Runtime & Framework

@context/blocks/construct/node.md
@context/foundations/construct/exec-tsx.md
@context/blocks/construct/orpc.md
@context/blocks/construct/zod.md

## test/ - Testing

@context/foundations/test/test-unit-vitest.md
@context/foundations/test/test-integration-api.md

## quality/ - Error Handling

@context/blocks/quality/error-handling.md

## security/ - Env & Hardening

@context/foundations/security/secrets-env-typed.md

## observe/ - Logging

@context/foundations/observe/log-structured-service.md

## construct/ - Database

@context/foundations/construct/data-persist-prisma.md

### oRPC-Prisma Integration

```typescript
// src/context.ts
import { os } from '@orpc/server'
import { prisma } from '@/db/client'

// Base context with DB
export const base = os
  .$context<{ headers: Headers }>()
  .use(async ({ next }) => {
    return next({ context: { db: prisma } })
  })

// All procedures inherit DB access
export const publicProcedure = base
export const protectedProcedure = base.use(requireAuth)
```

### Server Setup with Handlers

```typescript
// src/server.ts
import { createServer } from 'node:http'
import { RPCHandler } from '@orpc/server/node'
import { OpenAPIHandler } from '@orpc/openapi/node'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { CORSPlugin } from '@orpc/server/plugins'
import { router } from './router'
import { prisma } from './db/client'

const rpcHandler = new RPCHandler(router, {
  plugins: [new CORSPlugin()],
})

const openAPIHandler = new OpenAPIHandler(router, {
  plugins: [
    new CORSPlugin(),
    new OpenAPIReferencePlugin({
      docsProvider: 'scalar',
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: { title: 'API', version: '1.0.0' },
      },
    }),
  ],
})

const server = createServer(async (req, res) => {
  const context = { headers: new Headers(req.headers as Record<string, string>) }

  if (req.url?.startsWith('/rpc')) {
    const result = await rpcHandler.handle(req, res, { context })
    if (!result.matched) {
      res.statusCode = 404
      res.end('Procedure not found')
    }
  } else {
    const result = await openAPIHandler.handle(req, res, { context })
    if (!result.matched) {
      res.statusCode = 404
      res.end('Route not found')
    }
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  server.close()
})

server.listen(3000)
```
