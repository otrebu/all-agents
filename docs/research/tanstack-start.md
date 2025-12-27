# TanStack Start - Comprehensive Research

> **Last Updated:** December 2024
> **Status:** Release Candidate (RC)
> **Package:** `@tanstack/react-start`

## Table of Contents

1. [Overview & Current Status](#overview--current-status)
2. [Setup & Configuration](#setup--configuration)
3. [Server Functions](#server-functions)
4. [SSR/SSG/Rendering Modes](#ssrssgrendering-modes)
5. [Data Loading Patterns](#data-loading-patterns)
6. [Authentication Patterns](#authentication-patterns)
7. [API Routes (Server Routes)](#api-routes-server-routes)
8. [Middleware](#middleware)
9. [Deployment Targets](#deployment-targets)
10. [Comparison with Next.js/Remix](#comparison-with-nextjsremix)
11. [Current Limitations](#current-limitations)
12. [Migration from Vite+React](#migration-from-vitereact)
13. [Resources](#resources)

---

## Overview & Current Status

### What is TanStack Start?

TanStack Start is a **full-stack React meta-framework** built on TanStack Router and Vite. It enables developers to build applications with:

- Full-document server-side rendering (SSR)
- Progressive streaming
- Type-safe server functions (RPC pattern)
- Integrated server routes and API endpoints
- End-to-end TypeScript support
- Deployment to any Vite-compatible hosting provider

### Current Status: Release Candidate (RC)

As of late 2024, TanStack Start is in **Release Candidate** stage:

- **API is considered stable**
- **Feature-complete** for the initial release
- May still contain bugs - community feedback is encouraged
- **Not yet 1.0 stable** - expect some refinements

### Key Philosophy

> "TanStack Start prioritizes maximum developer freedom with best-in-class type safety."

Unlike frameworks that rely on "magic" conventions, TanStack Start provides explicit patterns where you choose:
- How data loads
- Where code runs
- What gets rendered

### What TanStack Start Does NOT Support (Yet)

- **React Server Components (RSC)** - The team is actively working on integration
- All code is bundled and shipped to the client (no server-only components by default)

---

## Setup & Configuration

### Quick Start (CLI)

The fastest way to create a new project:

```bash
# npm
npx create-start-app@latest

# pnpm
pnpm create start-app

# bun
bunx create-start-app
```

### Clone an Example

```bash
npx gitpick TanStack/router/tree/main/examples/react/start-basic start-basic
cd start-basic
npm install
npm run dev
```

### Build from Scratch

#### 1. Initialize Project

```bash
mkdir my-app
cd my-app
npm init -y
```

#### 2. Install Dependencies

```bash
# Core dependencies
npm i @tanstack/react-start @tanstack/react-router react react-dom

# Dev dependencies
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vite-tsconfig-paths
```

#### 3. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strictNullChecks": true
  }
}
```

> **Warning:** Avoid enabling `verbatimModuleSyntax` - it can cause server bundles to leak into client code.

#### 4. Package Configuration (`package.json`)

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  }
}
```

#### 5. Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),  // Must come BEFORE React plugin
    viteReact()
  ]
})
```

#### 6. Project Structure

```
.
├── src/
│   ├── routes/
│   │   ├── __root.tsx       # Root layout
│   │   └── index.tsx        # Home page
│   ├── router.tsx           # Router configuration
│   └── routeTree.gen.ts     # Auto-generated route tree
├── vite.config.ts
├── package.json
└── tsconfig.json
```

#### 7. Router Configuration (`src/router.tsx`)

```typescript
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

#### 8. Root Component (`src/routes/__root.tsx`)

```typescript
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My TanStack Start App' }
    ]
  }),
  component: RootComponent
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

---

## Server Functions

Server functions enable server-only logic that's callable from anywhere in your application - loaders, components, hooks, or other server functions.

### Basic Server Function

```typescript
import { createServerFn } from '@tanstack/react-start'

// GET request (default)
export const getData = createServerFn().handler(async () => {
  return { message: 'Hello from server!' }
})

// POST request
export const saveData = createServerFn({ method: 'POST' }).handler(async () => {
  return { success: true }
})
```

### Input Validation with Zod

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0)
})

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator(UserSchema)
  .handler(async ({ data }) => {
    // data is fully typed: { name: string, email: string, age: number }
    const user = await db.users.create({ data })
    return user
  })

// Usage
await createUser({ data: { name: 'John', email: 'john@example.com', age: 30 } })
```

### FormData Handling

```typescript
export const handleForm = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (data instanceof FormData) {
      return {
        name: data.get('name') as string,
        email: data.get('email') as string
      }
    }
    throw new Error('Expected FormData')
  })
  .handler(async ({ data }) => {
    // Process form data
    return { success: true }
  })
```

### Error Handling

```typescript
import { redirect, notFound } from '@tanstack/react-start'

export const getUser = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: userId }) => {
    const user = await db.users.findUnique({ where: { id: userId } })

    if (!user) {
      throw notFound()  // 404 response
    }

    if (!user.isActive) {
      throw redirect({ to: '/login' })  // Redirect
    }

    return user
  })
```

### Using in Components

```typescript
import { useServerFn } from '@tanstack/react-start'

function MyComponent() {
  const createUserFn = useServerFn(createUser)

  const handleSubmit = async (formData: FormData) => {
    const result = await createUserFn({
      data: {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        age: parseInt(formData.get('age') as string)
      }
    })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Request/Response Manipulation

```typescript
import {
  getRequest,
  getRequestHeader,
  setResponseHeader,
  setResponseStatus
} from '@tanstack/react-start/server'

export const myServerFn = createServerFn().handler(async () => {
  // Access request
  const request = getRequest()
  const authHeader = getRequestHeader('Authorization')

  // Modify response
  setResponseHeader('X-Custom-Header', 'value')
  setResponseStatus(201)

  return { created: true }
})
```

### Server-Only vs Client-Callable

```typescript
import { createServerFn, createServerOnlyFn, createClientOnlyFn } from '@tanstack/react-start'

// Callable from client (makes network request)
const serverFn = createServerFn().handler(async () => { ... })

// Throws error if called from client - for server utilities only
const serverOnlyFn = createServerOnlyFn().handler(async () => { ... })

// Throws error if called from server - for client utilities only
const clientOnlyFn = createClientOnlyFn().handler(async () => { ... })
```

---

## SSR/SSG/Rendering Modes

### Execution Model

> **All code in TanStack Start is isomorphic by default** - it runs and is included in both server and client bundles unless explicitly constrained.

Key insight: **Route loaders are isomorphic** - they execute on both the server during initial page render AND on the client during subsequent navigation.

### Selective SSR (Per-Route Control)

TanStack Start allows configuring SSR on a per-route basis:

```typescript
// Full SSR (default)
export const Route = createFileRoute('/dashboard')({
  ssr: true,  // beforeLoad, loader, and component run on server
  loader: () => fetchDashboardData()
})

// No SSR - Client-only rendering
export const Route = createFileRoute('/admin')({
  ssr: false,  // Everything runs on client during hydration
  loader: () => fetchAdminData()
})

// Data-only SSR (hybrid)
export const Route = createFileRoute('/profile')({
  ssr: 'data-only',  // Loaders run on server, component renders on client
  loader: () => fetchProfileData()
})
```

### Dynamic SSR Configuration

```typescript
export const Route = createFileRoute('/posts/$postId')({
  ssr: ({ params }) => {
    // Only SSR for featured posts
    return params.postId.startsWith('featured-')
  },
  loader: ({ params }) => fetchPost(params.postId)
})
```

### SSR Inheritance Rules

Child routes inherit parent SSR settings but can only become **more restrictive**:
- `true` -> `data-only` -> `false` (allowed)
- `false` -> `true` (not allowed)

### Streaming SSR

Streaming is automatic with `defaultStreamHandler` or `renderRouterToStream`. It sends HTML incrementally as it renders:

```typescript
// Deferred data loading for streaming
export const Route = createFileRoute('/posts')({
  loader: async () => {
    // Fast data - awaited, blocks initial render
    const quickData = await fetchQuickData()

    // Slow data - NOT awaited, streams later
    const slowDataPromise = fetchSlowData()

    return {
      quickData,
      slowDataPromise  // Will stream when resolved
    }
  }
})
```

### Static Server Functions (SSG/Prerendering)

For build-time static generation:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'

const getStaticContent = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])  // Must be last middleware
  .handler(async () => {
    const content = await fetchCMSContent()
    return content
  })
```

**How it works:**
1. At build time, server functions execute and cache results as static JSON
2. At runtime, cached data is served from static files
3. No server calls needed for prerendered content

### SPA Mode

For applications without SSR requirements:

```typescript
// vite.config.ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true
      }
    })
  ]
})
```

**SPA Mode Characteristics:**
- Generates static HTML "shell" at build time
- Full rendering happens client-side
- Server functions and routes still work
- Ideal for CDN-only hosting
- No SEO/crawler support by default

---

## Data Loading Patterns

TanStack Router (and by extension, Start) provides built-in **Stale-While-Revalidate (SWR) caching**.

### Route Loaders

```typescript
export const Route = createFileRoute('/posts')({
  loader: async ({ params, context, abortController }) => {
    const response = await fetch('/api/posts', {
      signal: abortController.signal
    })
    return response.json()
  },
  component: PostsPage
})

function PostsPage() {
  const posts = Route.useLoaderData()
  return <PostList posts={posts} />
}
```

### Loader Parameters

```typescript
loader: async ({
  params,           // Path parameters
  context,          // Router + route context
  abortController,  // For request cancellation
  cause,            // 'enter' | 'preload' | 'stay'
  deps,             // Custom dependencies
  preload           // Boolean - is this a preload?
}) => { ... }
```

### SWR Cache Configuration

```typescript
export const Route = createFileRoute('/posts')({
  // Cache settings
  staleTime: 10_000,      // Data fresh for 10 seconds
  gcTime: 30 * 60_000,    // Garbage collect after 30 minutes

  // Custom cache key based on search params
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),

  loader: async ({ deps: { page, limit } }) => {
    return fetchPosts({ page, limit })
  }
})
```

### Default Cache Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| `staleTime` | 0ms | Always refetch in background |
| `preloadStaleTime` | 30 seconds | Don't preload same route twice within 30s |
| `gcTime` | 30 minutes | Remove unused data after 30 min |

### Preloading/Prefetching

```typescript
// In router config
export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',  // 'intent' | 'viewport' | 'render' | false
    defaultPreloadStaleTime: 30_000
  })
}
```

**Preload Strategies:**
- **`intent`** - Preload on hover/touch (default)
- **`viewport`** - Preload when link is visible
- **`render`** - Preload when link renders

### beforeLoad Hook

Runs before loaders, great for auth checks and context injection:

```typescript
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    const user = await getUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    // Inject into context for loaders
    return { user }
  },
  loader: async ({ context: { user } }) => {
    return fetchDashboard(user.id)
  }
})
```

### Integration with TanStack Query

For more advanced caching, integrate with TanStack Query:

```typescript
import { QueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/posts')({
  loader: async ({ context: { queryClient } }) => {
    // Prefetch in loader
    await queryClient.prefetchQuery({
      queryKey: ['posts'],
      queryFn: fetchPosts
    })
  },
  component: PostsPage
})

function PostsPage() {
  // Use in component
  const { data: posts } = useSuspenseQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts
  })
  return <PostList posts={posts} />
}
```

### Deferred Data Loading

Show content immediately while slow data loads:

```typescript
import { Await } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // Fast data - await it
    const stats = await fetchStats()

    // Slow data - don't await, defer it
    const analyticsPromise = fetchAnalytics()

    return { stats, analyticsPromise }
  },
  component: Dashboard
})

function Dashboard() {
  const { stats, analyticsPromise } = Route.useLoaderData()

  return (
    <div>
      <Stats data={stats} />

      <Suspense fallback={<AnalyticsSkeleton />}>
        <Await promise={analyticsPromise}>
          {(analytics) => <Analytics data={analytics} />}
        </Await>
      </Suspense>
    </div>
  )
}
```

---

## Authentication Patterns

### Session Configuration

```typescript
// src/lib/session.ts
import { useSession } from '@tanstack/react-start/server'

type SessionData = {
  userId: string
  email: string
  role: 'user' | 'admin'
}

export function useAppSession() {
  return useSession<SessionData>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!, // Min 32 characters
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7  // 1 week
    }
  })
}
```

### Login Server Function

```typescript
import { createServerFn, redirect } from '@tanstack/react-start'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export const login = createServerFn({ method: 'POST' })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    const { email, password } = data

    // Find user
    const user = await db.users.findUnique({ where: { email } })
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new Error('Invalid credentials')
    }

    // Create session
    const session = await useAppSession()
    await session.update({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    throw redirect({ to: '/dashboard' })
  })
```

### Protected Routes with beforeLoad

```typescript
// src/routes/_authenticated.tsx (layout route)
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await useAppSession()
    const data = await session.data

    if (!data?.userId) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname }
      })
    }

    return { user: data }
  },
  component: AuthenticatedLayout
})

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()
  return (
    <div>
      <nav>Welcome, {user.email}</nav>
      <Outlet />
    </div>
  )
}
```

### Role-Based Access Control

```typescript
const requireRole = (requiredRole: 'user' | 'admin') => {
  return createServerFn().handler(async () => {
    const session = await useAppSession()
    const data = await session.data

    if (!data?.userId) {
      throw redirect({ to: '/login' })
    }

    if (data.role !== requiredRole && data.role !== 'admin') {
      throw new Error('Unauthorized')
    }

    return data
  })
}

// Usage in route
export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    await requireRole('admin')()
  }
})
```

### Logout

```typescript
export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/' })
})
```

### OAuth Flow Example

```typescript
export const initiateOAuth = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ provider: z.enum(['google', 'github']) }))
  .handler(async ({ data }) => {
    const state = crypto.randomUUID()

    // Store state for CSRF protection
    const session = await useAppSession()
    await session.update({ oauthState: state })

    const authUrl = buildOAuthUrl(data.provider, state)
    throw redirect({ to: authUrl, external: true })
  })

export const handleOAuthCallback = createServerFn()
  .inputValidator(z.object({ code: z.string(), state: z.string() }))
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const sessionData = await session.data

    // Verify state
    if (data.state !== sessionData?.oauthState) {
      throw new Error('Invalid OAuth state')
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(data.code)
    const userInfo = await fetchUserInfo(tokens.access_token)

    // Create/update user and session
    const user = await upsertUser(userInfo)
    await session.update({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    throw redirect({ to: '/dashboard' })
  })
```

### Security Best Practices

| Practice | Recommendation |
|----------|----------------|
| Password hashing | Use bcrypt, scrypt, or argon2 with 12+ salt rounds |
| Session cookies | `secure: true` in production, `sameSite: 'lax'`, `httpOnly: true` |
| Rate limiting | Limit login attempts (e.g., 5 per 15 minutes) |
| Input validation | Always validate with Zod or similar |
| CSRF protection | Use `sameSite` cookies + state tokens for OAuth |

---

## API Routes (Server Routes)

Server routes create REST API endpoints alongside your TanStack Router routes.

### Basic Server Route

```typescript
// src/routes/api/hello.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Response.json({ message: 'Hello, World!' })
      }
    }
  }
})
```

### Multiple HTTP Methods

```typescript
// src/routes/api/users.ts
export const Route = createFileRoute('/api/users')({
  server: {
    handlers: {
      GET: async () => {
        const users = await db.users.findMany()
        return Response.json(users)
      },

      POST: async ({ request }) => {
        const body = await request.json()
        const user = await db.users.create({ data: body })
        return Response.json(user, { status: 201 })
      }
    }
  }
})
```

### Dynamic Route Parameters

```typescript
// src/routes/api/users/$id.ts
export const Route = createFileRoute('/api/users/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await db.users.findUnique({
          where: { id: params.id }
        })

        if (!user) {
          return new Response('Not found', { status: 404 })
        }

        return Response.json(user)
      },

      PATCH: async ({ request, params }) => {
        const body = await request.json()
        const user = await db.users.update({
          where: { id: params.id },
          data: body
        })
        return Response.json(user)
      },

      DELETE: async ({ params }) => {
        await db.users.delete({ where: { id: params.id } })
        return new Response(null, { status: 204 })
      }
    }
  }
})
```

### Nested Dynamic Parameters

```typescript
// src/routes/api/users/$userId/posts/$postId.ts
export const Route = createFileRoute('/api/users/$userId/posts/$postId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { userId, postId } = params
        const post = await db.posts.findFirst({
          where: { id: postId, authorId: userId }
        })
        return Response.json(post)
      }
    }
  }
})
```

### Wildcard Routes

```typescript
// src/routes/api/files/$.ts (catches /api/files/*)
export const Route = createFileRoute('/api/files/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const filePath = params._splat  // e.g., "folder/subfolder/file.txt"
        const file = await readFile(filePath)
        return new Response(file)
      }
    }
  }
})
```

### Server Routes with Middleware

```typescript
import { createMiddleware } from '@tanstack/react-start'

const authMiddleware = createMiddleware().server(async ({ next }) => {
  const token = getRequestHeader('Authorization')
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  return next({ context: { userId: await verifyToken(token) } })
})

export const Route = createFileRoute('/api/protected')({
  server: {
    middleware: [authMiddleware],  // Applies to all methods
    handlers: ({ createHandlers }) => createHandlers({
      GET: {
        middleware: [additionalMiddleware],  // Per-method middleware
        handler: async ({ context }) => {
          return Response.json({ userId: context.userId })
        }
      }
    })
  }
})
```

### Combined UI + API Route

```typescript
// src/routes/posts.tsx
export const Route = createFileRoute('/posts')({
  // UI route
  loader: () => fetchPosts(),
  component: PostsPage,

  // API route in same file
  server: {
    handlers: {
      GET: async () => {
        const posts = await db.posts.findMany()
        return Response.json(posts)
      }
    }
  }
})
```

---

## Middleware

Middleware customizes server request and server function behavior.

### Request Middleware

Runs on every server request:

```typescript
import { createMiddleware } from '@tanstack/react-start'

const loggingMiddleware = createMiddleware().server(async ({ next }) => {
  const start = Date.now()
  const result = await next()
  console.log(`Request took ${Date.now() - start}ms`)
  return result
})
```

### Server Function Middleware

For server functions specifically:

```typescript
const authMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    // Client-side: Add auth header to request
    return next({
      headers: {
        Authorization: `Bearer ${getStoredToken()}`
      }
    })
  })
  .server(async ({ next }) => {
    // Server-side: Verify token
    const token = getRequestHeader('Authorization')
    const user = await verifyToken(token)
    return next({ context: { user } })
  })
```

### Middleware Composition

```typescript
const baseMiddleware = createMiddleware().server(async ({ next }) => {
  return next({ context: { requestId: crypto.randomUUID() } })
})

const authMiddleware = createMiddleware()
  .middleware([baseMiddleware])  // Depends on baseMiddleware
  .server(async ({ next, context }) => {
    console.log(`Request ${context.requestId}: Checking auth`)
    // ... auth logic
    return next({ context: { ...context, user } })
  })
```

### Input Validation in Middleware

```typescript
import { zodValidator } from '@tanstack/zod-adapter'

const workspaceMiddleware = createMiddleware({ type: 'function' })
  .inputValidator(zodValidator(z.object({ workspaceId: z.string() })))
  .server(async ({ next, data }) => {
    const workspace = await db.workspaces.findUnique({
      where: { id: data.workspaceId }
    })
    return next({ context: { workspace } })
  })
```

### Sending Context from Client to Server

By default, client context isn't sent to the server. Use `sendContext`:

```typescript
const workspaceMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next, context }) => {
    return next({
      sendContext: {
        workspaceId: context.workspaceId  // Explicitly send to server
      }
    })
  })
  .server(async ({ next, context }) => {
    // Validate server-side!
    const workspaceId = z.string().uuid().parse(context.workspaceId)
    return next({ context: { workspaceId } })
  })
```

### Global Middleware

```typescript
// src/start.ts
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  // Runs on every HTTP request
  requestMiddleware: [loggingMiddleware, corsMiddleware],

  // Runs on every server function call
  functionMiddleware: [authMiddleware]
}))
```

### Apply to Server Functions

```typescript
const myServerFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware, validationMiddleware])
  .handler(async ({ context }) => {
    // Access middleware-injected context
    const { user, workspace } = context
    // ...
  })
```

---

## Deployment Targets

TanStack Start deploys to any Vite-compatible hosting provider via **Nitro**.

### Official Partners

- **Cloudflare Workers** (recommended)
- **Netlify** (recommended)

### All Supported Targets

| Target | Package/Preset | Notes |
|--------|---------------|-------|
| Cloudflare Workers | `@cloudflare/vite-plugin` | Edge deployment |
| Netlify | `@netlify/vite-plugin-tanstack-start` | Serverless functions |
| Vercel | Nitro config | Serverless/Edge |
| Node.js | Default | Traditional server |
| Bun | `bun` preset | Requires React 19+ |
| Railway | Node.js | Container-based |
| Docker | Node.js | Container-based |

### Cloudflare Workers

```bash
npm i -D @cloudflare/vite-plugin wrangler
```

```typescript
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    cloudflare(),
    tanstackStart(),
    viteReact()
  ]
})
```

```jsonc
// wrangler.jsonc
{
  "name": "my-app",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

```bash
wrangler login
npm run build
wrangler deploy
```

### Netlify

```bash
npm i -D @netlify/vite-plugin-tanstack-start netlify-cli
```

```typescript
// vite.config.ts
import { netlify } from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  plugins: [
    netlify(),
    tanstackStart(),
    viteReact()
  ]
})
```

```bash
netlify deploy --prod
```

### Vercel

Follow Nitro deployment with Vercel preset.

### Node.js

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "start": "node .output/server/index.mjs"
  }
}
```

### Bun

> **Note:** Requires React 19.0.0+

```typescript
// vite.config.ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tanstackStart({
      nitro: {
        preset: 'bun'  // Optional but recommended
      }
    })
  ]
})
```

```bash
bun run build
bun .output/server/index.mjs
```

### SPA Mode Deployment

For CDN-only hosting:

```
# _redirects (Netlify)
/_serverFn/* /_serverFn/:splat 200
/api/* /api/:splat 200
/* /_shell.html 200
```

---

## Comparison with Next.js/Remix

### Feature Comparison

| Feature | TanStack Start | Next.js | React Router v7 |
|---------|---------------|---------|-----------------|
| **SSR** | Full SSR + streaming | Full SSR + streaming | Full SSR + streaming |
| **SPA Mode** | Full support | Requires custom code | Full support |
| **React Server Components** | In development | Full support | Experimental |
| **Client-Side Caching** | Built-in SWR | Fetch cache only | Manual integration |
| **Server Functions** | RPC-based with middleware | Server Actions | Actions |
| **Type Safety** | End-to-end | Limited | Good |
| **Static Generation** | ISR via Cache-Control | Proprietary ISR | ISR via Cache-Control |
| **Dev Server Speed** | Instant (Vite) | Slow (can take seconds) | Instant (Vite) |

### Philosophy Comparison

**TanStack Start:**
- Maximum developer freedom
- Explicit over magic
- Router-first architecture
- Deployment agnostic (no vendor lock-in)

**Next.js:**
- Convention over configuration
- Deep RSC integration
- Optimized for Vercel
- Production-ready defaults

**React Router v7 (Remix):**
- Web fundamentals first
- Progressive enhancement
- Standards-based primitives
- Nested routing emphasis

### When to Choose Each

**Choose TanStack Start when:**
- You need deployment flexibility (any hosting provider)
- Type-safe routing is a priority
- You want selective SSR per-route
- You're already using TanStack libraries (Query, Router)
- You prefer explicit over magical behavior

**Choose Next.js when:**
- You want React Server Components
- You're deploying to Vercel
- You prefer convention-based setup
- You need battle-tested production features

**Choose React Router v7 when:**
- You prioritize progressive enhancement
- You want web-standard forms/actions
- You're coming from Remix
- You need extensive nested routing

### Bundle Size

Based on patterns.dev benchmarks:
- Remix default JavaScript: ~371 kB
- Next.js default JavaScript: ~566 kB
- TanStack Start: Comparable to Remix (Vite-based)

### Developer Experience

| Aspect | TanStack Start | Next.js |
|--------|---------------|---------|
| Dev server startup | Milliseconds | Seconds (can be slow) |
| HMR speed | Lightning fast | Slow even with Turbopack |
| Memory usage | Lightweight | Significant CPU/RAM |
| Learning curve | Moderate | Moderate |

---

## Current Limitations

### Known Issues (as of late 2024)

1. **No React Server Components**
   - All code is bundled to client
   - Team is actively working on RSC integration
   - Expected in future releases

2. **VSCode Debugging Issues**
   - Breakpoints in server functions may not work consistently
   - Variable values may not display (only types shown)
   - Related to Vinxi/transpiled code handling

3. **Memory Leaks with SSR + TanStack Query**
   - Memory usage can grow over time in long-running processes
   - Related to queryClient lifecycle
   - Workaround: Monitor and restart processes

4. **TanStack Table Infinite Loops**
   - Specific issue with `getGroupedRowModel()` in Start projects
   - Works fine in plain Vite projects

5. **Documentation/Examples Lag**
   - Some examples may use outdated APIs
   - Server functions described as "in their infancy"
   - Third-party integration docs may be stale

6. **Breaking Changes During Beta**
   - API has stabilized in RC, but earlier versions had frequent changes
   - Major migration from Vinxi to Vite in v1.121.0

### Version Requirements

- **Node.js:** 22.12+ (as of v1.132 RC)
- **Vite:** 7.0+
- **React:** 18.x or 19.x (Bun requires 19.x)

### What's Missing vs. Next.js

| Feature | Status |
|---------|--------|
| React Server Components | In development |
| Image optimization | Use third-party (e.g., unpic) |
| Font optimization | Manual configuration |
| Built-in analytics | Use third-party |
| Turbopack-like dev speed | Already fast with Vite |

---

## Migration from Vite+React

### From Vite + React SPA

#### Step 1: Install Dependencies

```bash
npm i @tanstack/react-start @tanstack/react-router
npm i -D vite-tsconfig-paths
```

#### Step 2: Update Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart(),  // Before React plugin
    viteReact()
  ]
})
```

#### Step 3: Update Project Structure

**Before (Vite SPA):**
```
src/
├── App.tsx
├── main.tsx
├── pages/
│   ├── Home.tsx
│   └── About.tsx
└── components/
```

**After (TanStack Start):**
```
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx      # Home
│   └── about.tsx      # About
├── router.tsx
├── routeTree.gen.ts   # Auto-generated
└── components/
```

#### Step 4: Create Router Configuration

```typescript
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({ routeTree })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

#### Step 5: Create Root Route

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <html>
      <head><HeadContent /></head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
})
```

#### Step 6: Convert Pages to Routes

```typescript
// src/routes/index.tsx (was src/pages/Home.tsx)
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage() {
  return <div>Welcome!</div>
}
```

### From Vite + TanStack Router SPA

If already using TanStack Router, migration is simpler:

```typescript
// vite.config.ts
// Replace TanStackRouterVite with tanstackStart
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tanstackStart(),
    viteReact()
  ]
})
```

Then:
1. Move files from `app/` to `src/` (if needed)
2. Add `__root.tsx` with full HTML structure
3. Update imports from `@tanstack/react-router` to `@tanstack/react-start` where needed

### From Next.js

TanStack provides a dedicated migration guide. Key differences:

| Next.js | TanStack Start |
|---------|---------------|
| `pages/` or `app/` | `src/routes/` |
| `getServerSideProps` | Route `loader` |
| `getStaticProps` | `staticFunctionMiddleware` |
| API routes in `pages/api` | Server routes or `createServerFn` |
| `next/link` | `Link` from `@tanstack/react-router` |
| `next/image` | Third-party image optimization |

### SPA Mode (No SSR Migration)

If you want to keep SPA behavior:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: { enabled: true }
    }),
    viteReact()
  ]
})
```

This gives you TanStack Start's benefits without full SSR migration.

---

## Resources

### Official Documentation

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Getting Started Guide](https://tanstack.com/start/latest/docs/framework/react/getting-started)
- [Build from Scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch)

### Key Guides

- [Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Server Routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes)
- [Authentication](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)
- [Hosting/Deployment](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)

### Deployment Guides

- [Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/)
- [Vercel](https://vercel.com/docs/frameworks/full-stack/tanstack-start)
- [Bun](https://bun.com/docs/guides/ecosystem/tanstack-start)

### Community Resources

- [GitHub Repository](https://github.com/TanStack/router)
- [Beta Tracking Discussion](https://github.com/TanStack/router/discussions/2863)
- [TanStack Discord](https://tlinz.com/discord)

### Examples

- [Basic Auth Example](https://tanstack.com/start/latest/docs/framework/react/examples/start-basic-auth)
- [TanStack Query Integration](https://tanstack.com/start/latest/docs/framework/react/examples)
- [Supabase Auth Example](https://github.com/aaronksaunders/tanstack-start-supabase-auth)

### Third-Party Integrations

- [Clerk Authentication](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart)
- [Better Auth](https://www.better-auth.com/docs/integrations/tanstack)
- [Convex](https://docs.convex.dev/quickstart/tanstack-start)

### Articles & Tutorials

- [Full-Stack App with TanStack Start (LogRocket)](https://blog.logrocket.com/full-stack-app-with-tanstack-start/)
- [TanStack Start: A New Framework Revolutionizing React Development](https://medium.com/learnwithrahul/tanstack-start-a-new-framework-revolutionizing-react-development-4143de93fc7e)
- [Why Developers Are Leaving Next.js for TanStack Start (Appwrite)](https://appwrite.io/blog/post/why-developers-leaving-nextjs-tanstack-start)
- [Migrating TanStack Start from Vinxi to Vite](https://blog.logrocket.com/migrating-tanstack-start-vinxi-vite/)
