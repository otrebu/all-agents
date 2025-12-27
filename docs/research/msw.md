# MSW (Mock Service Worker) v2 - Complete Guide

> **Important:** This documentation covers MSW v2, which introduced significant breaking changes from v1. Pay close attention to the migration notes throughout.

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Request Handlers](#request-handlers)
4. [Request Matching](#request-matching)
5. [Response Mocking](#response-mocking)
6. [GraphQL Mocking](#graphql-mocking)
7. [Testing Integration](#testing-integration)
8. [Network Behavior](#network-behavior)
9. [v1 to v2 Migration](#v1-to-v2-migration)
10. [Best Practices](#best-practices)

---

## Overview

Mock Service Worker (MSW) is an API mocking library for browser and Node.js that intercepts outgoing requests at the network level.

### Key Features

- **Environment agnostic**: Works in browser (via Service Worker) and Node.js (via native module patching)
- **Framework agnostic**: Compatible with React, Vue, Angular, or any JavaScript framework
- **Standards-based**: Uses the Fetch API for request/response handling
- **Supports**: REST, GraphQL, and WebSocket APIs

### How It Works

| Environment | Mechanism |
|-------------|-----------|
| **Browser** | Registers a Service Worker that intercepts network requests |
| **Node.js** | Patches native `http`/`https` modules to observe and intercept traffic |

### Trusted By

Google, Microsoft, Spotify, Amazon, Netflix, and hundreds of thousands of engineers worldwide.

---

## Installation & Setup

### Installation

```bash
npm install msw --save-dev
# or
yarn add msw --dev
# or
pnpm add msw -D
```

> **v2 BREAKING CHANGE:** Requires Node.js 18.0.0 or higher. Earlier versions are no longer supported.

### Browser Setup

#### Step 1: Initialize the Worker Script

```bash
npx msw init ./public
```

This copies `mockServiceWorker.js` to your public directory.

#### Step 2: Create Browser Integration

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'  // v2: Import from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

> **v2 BREAKING CHANGE:** Browser exports (`setupWorker`, `SetupWorkerApi`, etc.) must now be imported from `msw/browser`, not from `msw`.

#### Step 3: Start the Worker

```typescript
// src/index.tsx
async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const { worker } = await import('./mocks/browser')
  return worker.start()
}

enableMocking().then(() => {
  // Render your app after mocking is enabled
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
```

**Important:** `worker.start()` returns a Promise. Always await it to prevent race conditions.

### Node.js Setup

```typescript
// src/mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

---

## Request Handlers

### v2 Syntax Overview

> **v2 BREAKING CHANGE:** The `rest` namespace is renamed to `http`. Use `http.get`, `http.post`, etc.

```typescript
// v1 (OLD - DO NOT USE)
import { rest } from 'msw'
rest.get('/user', (req, res, ctx) => {
  return res(ctx.json({ name: 'John' }))
})

// v2 (CURRENT)
import { http, HttpResponse } from 'msw'
http.get('/user', () => {
  return HttpResponse.json({ name: 'John' })
})
```

### HTTP Methods

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET request
  http.get('/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ])
  }),

  // POST request
  http.post('/users', async ({ request }) => {
    const newUser = await request.json()
    return HttpResponse.json(newUser, { status: 201 })
  }),

  // PUT request
  http.put('/users/:id', async ({ request, params }) => {
    const { id } = params
    const updates = await request.json()
    return HttpResponse.json({ id, ...updates })
  }),

  // PATCH request
  http.patch('/users/:id', async ({ request, params }) => {
    const { id } = params
    const updates = await request.json()
    return HttpResponse.json({ id, ...updates })
  }),

  // DELETE request
  http.delete('/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Match all methods
  http.all('/api/*', () => {
    return HttpResponse.json({ message: 'Catch all' })
  }),
]
```

### Response Resolver Signature

> **v2 BREAKING CHANGE:** Response resolver no longer uses `(req, res, ctx)`. It now receives a single object argument.

```typescript
// v2 Response Resolver
http.get('/user/:id', ({ request, params, cookies }) => {
  // request: Fetch API Request object
  // params: URL path parameters
  // cookies: Request cookies

  return HttpResponse.json({ id: params.id })
})
```

### Reading Request Body

> **v2 BREAKING CHANGE:** MSW no longer assumes request body type. Use standard Request methods.

```typescript
http.post('/user', async ({ request }) => {
  // Read as JSON
  const data = await request.json()

  // Or as text
  const text = await request.text()

  // Or as FormData
  const formData = await request.formData()

  // Or as ArrayBuffer
  const buffer = await request.arrayBuffer()

  return HttpResponse.json(data, { status: 201 })
})
```

### One-Time Handlers

```typescript
http.get('/greeting', () => HttpResponse.text('Hello world'), { once: true })
```

---

## Request Matching

### URL Patterns

MSW uses `path-to-regexp` for URL matching.

```typescript
// Exact match
http.get('/users', resolver)

// With path parameters
http.get('/users/:id', resolver)
http.get('/users/:userId/posts/:postId', resolver)

// Wildcard matching
http.get('/api/*', resolver)      // Matches /api/anything
http.get('*/users', resolver)     // Matches any origin

// Full URL
http.get('https://api.example.com/users', resolver)
```

### Path Parameters

```typescript
http.get<{ id: string }>('/posts/:id', ({ params }) => {
  const { id } = params  // Type: string
  return HttpResponse.json({ postId: id })
})

// Multiple parameters
http.get('/users/:userId/books/:bookId', ({ params }) => {
  const { userId, bookId } = params
  return HttpResponse.json({ userId, bookId })
})
```

### Query Parameters

> **Important:** Do NOT include query parameters in the handler URL. Access them via `request.url`.

```typescript
// WRONG - Do not do this
http.get('/products?category=electronics', resolver)

// CORRECT - Access query params in resolver
http.get('/products', ({ request }) => {
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const page = url.searchParams.get('page') || '1'

  if (!category) {
    return new HttpResponse(null, { status: 400 })
  }

  return HttpResponse.json({
    category,
    page: parseInt(page),
    products: []
  })
})
```

### Custom Request Predicate for Query Params

```typescript
// withSearchParams.ts
import { passthrough } from 'msw'

export function withSearchParams(predicate, resolver) {
  return (args) => {
    const { request } = args
    const url = new URL(request.url)

    if (!predicate(url.searchParams)) {
      return passthrough()
    }

    return resolver(args)
  }
}

// Usage
http.get('/products', withSearchParams(
  (params) => params.get('featured') === 'true',
  () => HttpResponse.json({ products: featuredProducts })
))
```

---

## Response Mocking

### HttpResponse Class

> **v2 BREAKING CHANGE:** The `ctx` utilities object is deprecated. Use `HttpResponse` class instead.

```typescript
import { http, HttpResponse } from 'msw'

// JSON response
http.get('/api/user', () => {
  return HttpResponse.json({
    id: 'abc-123',
    firstName: 'John',
    lastName: 'Maverick',
  })
})

// Text response
http.get('/text', () => {
  return HttpResponse.text('Hello world')
})

// HTML response
http.get('/page', () => {
  return HttpResponse.html('<h1>Hello</h1>')
})

// XML response
http.get('/feed', () => {
  return HttpResponse.xml('<rss version="2.0"></rss>')
})

// ArrayBuffer response
http.get('/binary', () => {
  return HttpResponse.arrayBuffer(buffer)
})

// FormData response
http.get('/form', () => {
  return HttpResponse.formData(formData)
})
```

### Status Codes and Headers

```typescript
// Custom status code
http.get('/resource', () => {
  return new HttpResponse(null, { status: 201 })
})

// With status text
http.get('/resource', () => {
  return new HttpResponse(null, {
    status: 404,
    statusText: 'Not Found'
  })
})

// Custom headers
http.get('/resource', () => {
  return HttpResponse.json(
    { data: 'value' },
    {
      status: 200,
      headers: {
        'X-Custom-Header': 'foo',
        'Cache-Control': 'no-cache',
      },
    }
  )
})
```

### Setting Cookies

```typescript
http.get('/login', () => {
  return new HttpResponse(null, {
    headers: {
      'Set-Cookie': 'token=abc-123; Path=/; HttpOnly',
    },
  })
})

// Multiple cookies (use Headers for multiple Set-Cookie)
http.get('/login', () => {
  const headers = new Headers()
  headers.append('Set-Cookie', 'token=abc-123; Path=/')
  headers.append('Set-Cookie', 'session=xyz-789; Path=/')

  return new HttpResponse(null, { headers })
})
```

### Reading Request Cookies

```typescript
http.get('/protected', ({ cookies }) => {
  const { token } = cookies

  if (!token) {
    return new HttpResponse(null, { status: 401 })
  }

  return HttpResponse.json({ authenticated: true })
})
```

### Delayed Responses

```typescript
import { http, HttpResponse, delay } from 'msw'

// Fixed delay (milliseconds)
http.get('/slow', async () => {
  await delay(1000)  // Wait 1 second
  return HttpResponse.json({ data: 'Delayed response' })
})

// Realistic delay
http.get('/realistic', async () => {
  await delay('real')  // Random realistic delay
  return HttpResponse.json({ data: 'value' })
})

// Infinite delay (for loading states - use carefully in tests)
http.get('/pending', async () => {
  await delay('infinite')  // Never resolves
  return HttpResponse.json({ data: 'Never reached' })
})
```

### Global Response Delay

```typescript
export const handlers = [
  // This runs first, adds delay, but doesn't return response
  http.all('*', async () => {
    await delay(500)
    // No return = continues to next handler
  }),

  // Actual handlers
  http.get('/user', () => HttpResponse.json({ name: 'John' })),
]
```

### Error Responses

```typescript
// HTTP error responses (server errors)
http.get('/error', () => {
  return HttpResponse.json(
    { error: 'Something went wrong' },
    { status: 500 }
  )
})

http.get('/not-found', () => {
  return new HttpResponse(null, { status: 404 })
})

// Network errors (connection failures)
http.get('/network-error', () => {
  return HttpResponse.error()  // Simulates network failure
})
```

> **Note:** Network errors (`HttpResponse.error()`) are different from HTTP errors. Network errors reject the request promise entirely, simulating a failed connection.

---

## GraphQL Mocking

### Basic Setup

```typescript
import { graphql, HttpResponse } from 'msw'

export const handlers = [
  // Query
  graphql.query('GetUser', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
        },
      },
    })
  }),

  // Mutation
  graphql.mutation('CreateUser', ({ variables }) => {
    const { input } = variables
    return HttpResponse.json({
      data: {
        createUser: {
          id: 'new-id',
          name: input.name,
        },
      },
    })
  }),
]
```

### Accessing Variables

```typescript
graphql.query('GetUser', ({ variables }) => {
  const { userId } = variables

  return HttpResponse.json({
    data: {
      user: { id: userId, name: 'John' },
    },
  })
})
```

### GraphQL Errors

```typescript
graphql.query('GetUser', () => {
  return HttpResponse.json({
    errors: [
      { message: 'User not found' },
    ],
  })
})

// Partial data with errors
graphql.query('GetUserWithPosts', () => {
  return HttpResponse.json({
    data: {
      user: { id: '1', name: 'John' },
      posts: null,  // Failed to load
    },
    errors: [
      { message: 'Failed to fetch posts' },
    ],
  })
})
```

### Multiple GraphQL Endpoints

```typescript
import { graphql, HttpResponse } from 'msw'

const github = graphql.link('https://api.github.com/graphql')
const stripe = graphql.link('https://api.stripe.com/graphql')

export const handlers = [
  github.query('GetRepository', () => {
    return HttpResponse.json({
      data: {
        repository: { name: 'msw', stars: 15000 },
      },
    })
  }),

  stripe.query('GetPayment', () => {
    return HttpResponse.json({
      data: {
        payment: { id: 'pay_123', amount: 1000 },
      },
    })
  }),
]
```

### TypedDocumentNode (with GraphQL Code Generator)

```typescript
import { graphql, HttpResponse } from 'msw'
import { GetUserDocument, CreateUserDocument } from './generated/types'

export const handlers = [
  graphql.query(GetUserDocument, ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: { id: variables.id, name: 'John' },
      },
    })
  }),

  graphql.mutation(CreateUserDocument, ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: { id: 'new-id', name: variables.input.name },
      },
    })
  }),
]
```

### Intercepting All GraphQL Operations

```typescript
graphql.operation(({ query, variables, operationName }) => {
  console.log('GraphQL operation:', operationName)

  // Match based on operation name pattern
  if (operationName?.includes('User')) {
    return HttpResponse.json({
      data: { user: { id: '1', name: 'John' } },
    })
  }
})
```

### Regular Expression Matching

```typescript
// Match multiple operations
graphql.query(/User/, () => {
  return HttpResponse.json({
    data: { user: { id: '1', name: 'John' } },
  })
})
```

---

## Testing Integration

### Vitest Setup

#### 1. Create Server File

```typescript
// src/mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

#### 2. Configure Vitest Setup File

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './src/mocks/node'

// Enable mocking before all tests
beforeAll(() => server.listen())

// Reset handlers after each test (important!)
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())
```

#### 3. Update Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### Jest Setup

```typescript
// jest.setup.ts
import { server } from './src/mocks/node'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['./jest.setup.ts'],
}
```

> **Jest Note:** Since MSW v2 uses the Fetch API, you may need to install `undici` for Node.js environments without native fetch support.

### Playwright Integration

#### Using playwright-msw Package

```bash
npm install playwright-msw --save-dev
```

```typescript
// playwright/fixtures.ts
import { test as base, expect } from '@playwright/test'
import { http, HttpResponse } from 'msw'
import type { MockServiceWorker } from 'playwright-msw'
import { createWorkerFixture } from 'playwright-msw'
import { handlers } from './handlers'

const test = base.extend<{
  worker: MockServiceWorker
  http: typeof http
}>({
  worker: createWorkerFixture(handlers),
  http,
})

export { expect, test }
```

```typescript
// tests/example.spec.ts
import { test, expect } from './fixtures'
import { http, HttpResponse } from 'msw'

test('loads user data', async ({ page, worker }) => {
  await page.goto('/')
  await expect(page.getByText('John')).toBeVisible()
})

test('handles error state', async ({ page, worker }) => {
  await worker.use(
    http.get('/api/user', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  await page.goto('/')
  await expect(page.getByText('Error loading user')).toBeVisible()
})
```

> **playwright-msw v3:** Updated to use MSW 2.x syntax. Follow the MSW migration guide.

### Vitest Browser Mode

For Vitest Browser Mode, MSW runs in actual browser context:

```typescript
// vitest.browser.setup.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

const worker = setupWorker(...handlers)

beforeAll(async () => {
  await worker.start()
})

afterAll(() => {
  worker.stop()
})
```

### Test-Specific Handlers

```typescript
import { http, HttpResponse } from 'msw'
import { server } from './mocks/node'

test('handles loading state', async () => {
  server.use(
    http.get('/api/user', async () => {
      await delay(1000)
      return HttpResponse.json({ name: 'John' })
    })
  )

  // Test loading UI...
})

test('handles error state', async () => {
  server.use(
    http.get('/api/user', () => {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    })
  )

  // Test error UI...
})
```

---

## Network Behavior

### passthrough()

Explicitly allows an intercepted request to pass through to the actual server.

```typescript
import { http, passthrough, HttpResponse } from 'msw'

export const handlers = [
  http.get('/resource', ({ request }) => {
    // Conditionally pass through
    if (request.headers.has('x-real-request')) {
      return passthrough()
    }

    return HttpResponse.json({ mocked: true })
  }),
]
```

**Key points:**
- Does NOT make an additional request
- Request is still considered "handled"
- No other handlers will match after passthrough

### bypass()

Creates a request that will never be intercepted by MSW.

```typescript
import { http, HttpResponse, bypass } from 'msw'

http.get('/resource', async ({ request }) => {
  // Fetch the real response
  const originalResponse = await fetch(bypass(request))
  const data = await originalResponse.json()

  // Modify and return
  return HttpResponse.json({
    ...data,
    modified: true,
  })
})
```

**Key points:**
- Results in an additional request
- Request completely bypasses all handlers
- Can be used anywhere, not just in resolvers

### Response Patching Pattern

```typescript
import { http, HttpResponse, bypass } from 'msw'

http.get('/api/user', async ({ request }) => {
  // Get real response
  const response = await fetch(bypass(request))
  const user = await response.json()

  // Patch the response
  return HttpResponse.json({
    ...user,
    isAdmin: true,  // Add/modify fields
  })
})
```

### Default Network Behavior

MSW takes a "network-first" approach:

- **Unhandled requests:** Pass through to actual servers by default
- **Explicit handling:** Only requests matching handlers are intercepted
- **Warning on unhandled:** Optionally warn about requests without handlers

```typescript
server.listen({
  onUnhandledRequest: 'warn',  // 'bypass' | 'warn' | 'error'
})
```

---

## v1 to v2 Migration

### Overview of Breaking Changes

| Change | v1 | v2 |
|--------|----|----|
| Node.js version | Any | 18.0.0+ |
| REST namespace | `rest` | `http` |
| Import path | `msw` | `msw/browser`, `msw/node` |
| Resolver signature | `(req, res, ctx)` | `({ request, params, cookies })` |
| Response creation | `res(ctx.json(...))` | `HttpResponse.json(...)` |
| Request body | `req.body` | `await request.json()` |
| Context utilities | `ctx.*` | `HttpResponse` class |

### Import Changes

```typescript
// v1
import { setupWorker, rest } from 'msw'

// v2
import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
```

### Handler Syntax Changes

```typescript
// v1 (OLD)
rest.get('/user', (req, res, ctx) => {
  return res(
    ctx.status(200),
    ctx.json({ name: 'John' })
  )
})

// v2 (NEW)
http.get('/user', () => {
  return HttpResponse.json(
    { name: 'John' },
    { status: 200 }
  )
})
```

### Request Body Changes

```typescript
// v1 (OLD)
rest.post('/user', (req, res, ctx) => {
  const { name } = req.body  // Automatic parsing
  return res(ctx.json({ name }))
})

// v2 (NEW)
http.post('/user', async ({ request }) => {
  const { name } = await request.json()  // Manual parsing
  return HttpResponse.json({ name })
})
```

### Context Utilities Mapping

| v1 (`ctx.*`) | v2 Equivalent |
|--------------|---------------|
| `ctx.json(data)` | `HttpResponse.json(data)` |
| `ctx.text(text)` | `HttpResponse.text(text)` |
| `ctx.xml(xml)` | `HttpResponse.xml(xml)` |
| `ctx.status(code)` | `{ status: code }` option |
| `ctx.set(headers)` | `{ headers }` option |
| `ctx.cookie(name, value)` | `Set-Cookie` header |
| `ctx.delay(ms)` | `await delay(ms)` |
| `ctx.fetch(req)` | `fetch(bypass(request))` |

### Passthrough Changes

```typescript
// v1 (OLD)
rest.get('/resource', (req, res, ctx) => {
  return req.passthrough()
})

// v2 (NEW)
import { passthrough } from 'msw'

http.get('/resource', () => {
  return passthrough()
})
```

### Life-cycle Events Signature

```typescript
// v1 (OLD)
server.events.on('request:start', (req) => {
  console.log(req.url)
})

// v2 (NEW)
server.events.on('request:start', ({ request }) => {
  console.log(request.url)
})
```

### Other Changes

| v1 | v2 |
|----|----|
| `.printHandlers()` | `.listHandlers()` |
| `NetworkError` class | `Response.error()` / `HttpResponse.error()` |

### Automated Migration

Use the official codemod for automated migration:

```bash
npx @codemod/cli msw/2/upgrade-recipe
```

This handles:
- Import updates
- Handler signature changes
- Response composition changes
- Type argument updates

---

## Best Practices

### Handler Organization

#### Domain-Based Structure (Recommended)

```
src/mocks/
├── handlers/
│   ├── index.ts      # Combines all handlers
│   ├── user.ts       # User-related endpoints
│   ├── products.ts   # Product endpoints
│   └── auth.ts       # Authentication endpoints
├── fixtures/
│   ├── users.ts      # User mock data
│   └── products.ts   # Product mock data
├── browser.ts        # Browser worker setup
└── node.ts           # Node server setup
```

```typescript
// src/mocks/handlers/index.ts
import { userHandlers } from './user'
import { productHandlers } from './products'
import { authHandlers } from './auth'

export const handlers = [
  ...userHandlers,
  ...productHandlers,
  ...authHandlers,
]
```

```typescript
// src/mocks/handlers/user.ts
import { http, HttpResponse } from 'msw'
import { users } from '../fixtures/users'

export const userHandlers = [
  http.get('/api/users', () => {
    return HttpResponse.json(users)
  }),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find(u => u.id === params.id)
    if (!user) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(user)
  }),
]
```

### Fixtures Management

```typescript
// src/mocks/fixtures/users.ts
export const users = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
]

export const createUser = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: 'New User',
  email: 'new@example.com',
  ...overrides,
})
```

### Higher-Order Resolvers

```typescript
// withAuth.ts
import { HttpResponse } from 'msw'

export function withAuth(resolver) {
  return (args) => {
    const { cookies } = args

    if (!cookies.token) {
      return new HttpResponse(null, { status: 401 })
    }

    return resolver(args)
  }
}

// Usage
http.get('/api/protected', withAuth(({ cookies }) => {
  return HttpResponse.json({ secret: 'data' })
}))
```

### Runtime Handler Overrides

```typescript
// In tests
test('handles empty state', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json([])
    })
  )

  // Test empty state UI...
})

// Handlers reset after each test via server.resetHandlers()
```

### Error Handling Patterns

```typescript
// Reusable error responses
const errors = {
  unauthorized: () => new HttpResponse(null, { status: 401 }),
  forbidden: () => new HttpResponse(null, { status: 403 }),
  notFound: (message = 'Not found') =>
    HttpResponse.json({ error: message }, { status: 404 }),
  serverError: () =>
    HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
}

// Usage
http.get('/api/resource', () => {
  return errors.notFound('Resource not found')
})
```

### Logging Requests (Development)

```typescript
// src/mocks/handlers/logging.ts
import { http } from 'msw'

export const loggingHandlers = [
  http.all('*', ({ request }) => {
    console.log(`[MSW] ${request.method} ${request.url}`)
    // Don't return - let other handlers process
  }),
]

// Add to beginning of handlers array
export const handlers = [
  ...loggingHandlers,
  ...otherHandlers,
]
```

### Sharing Handlers Between Environments

```typescript
// handlers.ts - shared between browser and node
export const handlers = [...]

// browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)

// node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

---

## Resources

- [Official Documentation](https://mswjs.io/docs/)
- [Migration Guide (v1 to v2)](https://mswjs.io/docs/migrations/1.x-to-2.x/)
- [MSW 2.0 Announcement](https://mswjs.io/blog/introducing-msw-2.0)
- [GitHub Repository](https://github.com/mswjs/msw)
- [npm Package](https://www.npmjs.com/package/msw)
- [GraphQL API Reference](https://mswjs.io/docs/api/graphql/)
- [HTTP API Reference](https://mswjs.io/docs/api/http/)
- [HttpResponse Reference](https://mswjs.io/docs/api/http-response/)
