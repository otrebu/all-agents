# TanStack Router - Comprehensive Research Guide

> Last updated: December 2025
> Version: 1.x (Latest: 1.141.3)

TanStack Router is a client-first, server-capable, fully type-safe router and full-stack framework for React. It provides 100% inferred TypeScript support, file-based routing, and built-in caching capabilities.

## Table of Contents

1. [Installation and Setup](#installation-and-setup)
2. [File-Based Routing](#file-based-routing)
3. [Route Parameters (Type-Safe)](#route-parameters-type-safe)
4. [Search Params Handling](#search-params-handling)
5. [Route Loaders and Data Fetching](#route-loaders-and-data-fetching)
6. [Route Guards and Authentication](#route-guards-and-authentication)
7. [Nested Routes and Layouts](#nested-routes-and-layouts)
8. [Link Component and Navigation](#link-component-and-navigation)
9. [Code Splitting and Lazy Loading](#code-splitting-and-lazy-loading)
10. [Devtools](#devtools)
11. [Comparison with React Router](#comparison-with-react-router)
12. [Best Practices and Patterns](#best-practices-and-patterns)

---

## Installation and Setup

### Prerequisites

- React 18.x.x or 19.x.x
- ReactDOM 18.x.x or 19.x.x with `createRoot` support
- TypeScript 5.3.x or higher (recommended)

### Quick Start with CLI

The fastest way to get started is using the official scaffold tool:

```bash
npx create-tsrouter-app@latest
```

The CLI prompts configuration choices including:
- File-based or code-based route configuration
- TypeScript support
- Tailwind CSS integration
- Toolchain setup
- Git initialization

For file-based routing specifically:

```bash
npx create-tsrouter-app@latest my-app --template file-router
```

### Manual Installation

```bash
# npm
npm install @tanstack/react-router

# pnpm
pnpm add @tanstack/react-router

# yarn
yarn add @tanstack/react-router

# bun
bun add @tanstack/react-router
```

### Bundler Plugin Setup (Vite)

For file-based routing with Vite, install the router plugin:

```bash
npm install @tanstack/router-plugin
```

Configure in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
  ],
})
```

### Creating a Router Instance

```typescript
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Create the router instance
const router = createRouter({ routeTree })

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render
function App() {
  return <RouterProvider router={router} />
}
```

---

## File-Based Routing

File-based routing configures routes using the filesystem. Routes are organized in a directory structure that mirrors your URL hierarchy.

### Benefits

- **Simplicity**: Visually intuitive and easy to understand
- **Organization**: Routes mirror URL structure
- **Scalability**: Easy to add new routes and maintain existing ones
- **Automatic code-splitting**: Better performance out of the box
- **Type-safety**: Auto-generated type linkages for routes
- **Consistency**: Enforces consistent structure

### File Naming Conventions

| Convention | Purpose | Example |
|-----------|---------|---------|
| `__root.tsx` | Root route file (required) | `routes/__root.tsx` |
| `.` separator | Denotes nested routes | `blog.post.tsx` -> child of `blog` |
| `$` prefix | Dynamic path parameters | `$postId.tsx` -> `/posts/:postId` |
| `_` prefix | Pathless layout routes | `_layout.tsx` |
| `_` suffix | Excludes from parent nesting | `post_.tsx` |
| `-` prefix | Removes from route tree | `-components/` |
| `(folder)` | Route groups (organizational) | `(auth)/login.tsx` |
| `[x]` | Escape special characters | `script[.]js.tsx` -> `/script.js` |
| `index` | Matches parent exactly | `posts/index.tsx` -> `/posts` |
| `.route.tsx` | Alternative route file syntax | `blog/post/route.tsx` |
| `.lazy.tsx` | Lazy-loaded component | `posts.lazy.tsx` |

### Directory Structure Examples

**Flat routing style:**

```
routes/
├── __root.tsx
├── index.tsx           # /
├── about.tsx           # /about
├── posts.tsx           # /posts (layout)
├── posts.index.tsx     # /posts
├── posts.$postId.tsx   # /posts/:postId
```

**Directory routing style:**

```
routes/
├── __root.tsx
├── index.tsx
├── about.tsx
├── posts/
│   ├── route.tsx       # /posts (layout)
│   ├── index.tsx       # /posts
│   └── $postId.tsx     # /posts/:postId
```

**Mixed routing style:**

```
routes/
├── __root.tsx
├── index.tsx
├── posts/
│   ├── route.tsx
│   └── $postId.tsx
├── settings.profile.tsx  # /settings/profile (flat)
├── settings.account.tsx  # /settings/account (flat)
```

### Basic Route File

```typescript
// routes/posts.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts')({
  component: PostsComponent,
})

function PostsComponent() {
  return <div>Posts Page</div>
}
```

### Root Route

```typescript
// routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div>
      <nav>{/* Navigation */}</nav>
      <Outlet />
    </div>
  ),
})
```

---

## Route Parameters (Type-Safe)

TanStack Router provides fully inferred type-safe route parameters without manual type assertions.

### Defining Dynamic Routes

Route path segments starting with `$` are dynamic:

```typescript
// routes/posts.$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    // params.postId is typed as string
    return fetchPost(params.postId)
  },
  component: PostComponent,
})

function PostComponent() {
  // Type-safe access to params
  const { postId } = Route.useParams()
  return <div>Post {postId}</div>
}
```

### Accessing Parameters

**In Loaders:**

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return fetchPost(params.postId)
  },
})
```

**In Components:**

```typescript
function PostComponent() {
  const { postId } = Route.useParams()
  return <div>Post {postId}</div>
}
```

**Globally (any component):**

```typescript
import { useParams } from '@tanstack/react-router'

function AnyComponent() {
  // strict: false for shared components
  const params = useParams({ strict: false })
  return <div>{params.postId}</div>
}
```

### Path Parameter Patterns

**Simple parameter:**
```
/posts/$postId  ->  /posts/123  ->  { postId: '123' }
```

**Multiple parameters:**
```
/users/$userId/posts/$postId  ->  /users/5/posts/123  ->  { userId: '5', postId: '123' }
```

**With prefix/suffix (using curly braces):**
```typescript
// Route: /posts/post-{$postId}
// URL: /posts/post-123
// Params: { postId: '123' }

// Route: /files/{$fileName}.txt
// URL: /files/document.txt
// Params: { fileName: 'document' }
```

**Optional parameters:**
```typescript
// Route: /posts/{-$category}
// Matches: /posts OR /posts/tech
// Params: { category: 'tech' | undefined }
```

### Parameter Validation

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  params: {
    parse: (params) => ({
      postId: Number(params.postId),
    }),
    stringify: (params) => ({
      postId: String(params.postId),
    }),
  },
  loader: async ({ params }) => {
    // params.postId is now typed as number
    return fetchPost(params.postId)
  },
})
```

---

## Search Params Handling

TanStack Router treats search params as first-class state with JSON serialization and schema validation.

### JSON-First Approach

Search params are automatically serialized as JSON, supporting complex data structures:

```typescript
<Link
  to="/shop"
  search={{
    pageIndex: 3,
    includeCategories: ['electronics', 'gifts'],
    sortBy: 'price',
    desc: true,
  }}
/>
// Generates: /shop?pageIndex=3&includeCategories=%5B%22electronics%22%2C%22gifts%22%5D&sortBy=price&desc=true
```

### Schema Validation with Zod

Install the Zod adapter:

```bash
npm install @tanstack/zod-adapter zod
```

Define validated search params:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { zodValidator, fallback } from '@tanstack/zod-adapter'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), '').default(''),
  sort: fallback(z.enum(['newest', 'oldest', 'price']), 'newest').default('newest'),
  categories: fallback(z.array(z.string()), []).default([]),
})

export const Route = createFileRoute('/products')({
  validateSearch: zodValidator(productSearchSchema),
  component: ProductsComponent,
})
```

### Accessing Search Params

**In Components:**

```typescript
function ProductsComponent() {
  // Fully typed based on schema
  const { page, filter, sort, categories } = Route.useSearch()

  return (
    <div>
      <p>Page: {page}</p>
      <p>Filter: {filter}</p>
      <p>Sort: {sort}</p>
    </div>
  )
}
```

**Selective access:**

```typescript
function ProductsComponent() {
  const { page, filter } = Route.useSearch({
    select: (search) => ({
      page: search.page,
      filter: search.filter,
    }),
  })
  return <div>Page {page}, Filter: {filter}</div>
}
```

### Updating Search Params

**Via Link component:**

```typescript
<Link to="/products" search={{ page: 2, filter: 'active' }}>
  Page 2
</Link>

// Merge with existing params
<Link to="/products" search={(prev) => ({ ...prev, page: prev.page + 1 })}>
  Next Page
</Link>
```

**Via navigate:**

```typescript
import { useNavigate } from '@tanstack/react-router'

function Pagination() {
  const navigate = useNavigate()

  const goToPage = (page: number) => {
    navigate({
      to: '/products',
      search: (prev) => ({ ...prev, page }),
    })
  }

  return <button onClick={() => goToPage(5)}>Go to Page 5</button>
}
```

### Search Param Middleware

**Retain search params across navigation:**

```typescript
import { retainSearchParams } from '@tanstack/react-router'

export const Route = createFileRoute('/products')({
  search: {
    middlewares: [retainSearchParams(['filter', 'sort'])],
  },
})
```

**Strip search params:**

```typescript
import { stripSearchParams } from '@tanstack/react-router'

export const Route = createFileRoute('/products')({
  search: {
    middlewares: [stripSearchParams(['debug'])],
  },
})
```

### Other Validation Libraries

- **Valibot**: Implements Standard Schema (no adapter needed)
- **ArkType**: Standard Schema support (`@tanstack/arktype-adapter`)

---

## Route Loaders and Data Fetching

TanStack Router provides built-in data loading with SWR caching, parallel execution, and Suspense support.

### Route Loading Lifecycle

1. **Route Matching** (top-down): Parse params and validate search params
2. **Route Pre-Loading** (serial): Execute `beforeLoad` functions
3. **Route Loading** (parallel): Preload component, execute loader
4. **Rendering**: Show pending component, then render

### Basic Loader

```typescript
export const Route = createFileRoute('/posts')({
  loader: async () => {
    return fetchPosts()
  },
  component: PostsComponent,
})

function PostsComponent() {
  const posts = Route.useLoaderData()
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### Loader Parameters

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params, context, abortController, cause, preload }) => {
    // params: Route path parameters
    // context: Router and route context
    // abortController: Cancels when route unloads
    // cause: 'enter' | 'preload' | 'stay'
    // preload: Boolean indicating preload vs. load

    return fetchPost(params.postId, {
      signal: abortController.signal,
    })
  },
})
```

### beforeLoad vs loader

**`beforeLoad`:**
- Runs sequentially (parent to child)
- Blocks all loaders
- Good for authentication checks, redirects
- Can modify context for child routes

**`loader`:**
- Runs in parallel across routes
- Good for data fetching
- Has access to context from beforeLoad

```typescript
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    // Runs first, sequentially
    const user = await validateSession()
    return { user } // Merged into context
  },
  loader: async ({ context }) => {
    // Runs after beforeLoad, in parallel with sibling loaders
    return fetchDashboardData(context.user.id)
  },
})
```

### Context for Dependency Injection

**Setup router context:**

```typescript
const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: undefined!, // Provided at render time
  },
})
```

**Use in routes:**

```typescript
export const Route = createFileRoute('/posts')({
  loader: async ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(postsQueryOptions())
  },
})
```

### Search Params in Loaders

Use `loaderDeps` to declare search param dependencies:

```typescript
export const Route = createFileRoute('/posts')({
  loaderDeps: ({ search: { page, filter } }) => ({ page, filter }),
  loader: async ({ deps: { page, filter } }) => {
    return fetchPosts({ page, filter })
  },
})
```

### Caching Configuration

```typescript
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  // Data freshness duration (default: 0ms for navigations, 30s for preloads)
  staleTime: 1000 * 60 * 5, // 5 minutes
  // Garbage collection interval (default: 30 minutes)
  gcTime: 1000 * 60 * 30,
  // Control reload behavior
  shouldReload: ({ cause }) => cause === 'enter',
})
```

### Error Handling

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId)
    if (!post) {
      throw new Error('Post not found')
    }
    return post
  },
  onError: ({ error }) => {
    console.error('Loading error:', error)
  },
  errorComponent: ({ error, reset }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  ),
})
```

### Deferred Data Loading

For non-critical data that can load in the background:

```typescript
import { defer, Await } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    return {
      criticalData: await fetchCriticalData(), // Awaited immediately
      analyticsPromise: defer(fetchAnalytics()), // Deferred
    }
  },
  component: DashboardComponent,
})

function DashboardComponent() {
  const { criticalData, analyticsPromise } = Route.useLoaderData()

  return (
    <div>
      <CriticalSection data={criticalData} />
      <Suspense fallback={<Loading />}>
        <Await promise={analyticsPromise}>
          {(analytics) => <Analytics data={analytics} />}
        </Await>
      </Suspense>
    </div>
  )
}
```

### Integration with TanStack Query

```typescript
import { queryOptions } from '@tanstack/react-query'

const postsQueryOptions = () =>
  queryOptions({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

export const Route = createFileRoute('/posts')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(postsQueryOptions()),
  component: PostsComponent,
})

function PostsComponent() {
  const { data: posts } = useSuspenseQuery(postsQueryOptions())
  return <PostsList posts={posts} />
}
```

---

## Route Guards and Authentication

TanStack Router implements authentication through the `beforeLoad` route option.

### Basic Authentication Guard

```typescript
// routes/_authenticated.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})
```

### Protected Route Structure

```
routes/
├── __root.tsx
├── index.tsx
├── login.tsx
├── _authenticated.tsx          # Auth guard (pathless layout)
├── _authenticated/
│   ├── dashboard.tsx           # Protected: /dashboard
│   ├── profile.tsx             # Protected: /profile
│   └── settings.tsx            # Protected: /settings
```

### Context-Based Authentication

**Define router context type:**

```typescript
interface RouterContext {
  auth: {
    isAuthenticated: boolean
    user: User | null
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})
```

**Provide context at render:**

```typescript
function App() {
  const auth = useAuth() // Your auth hook

  return (
    <RouterProvider
      router={router}
      context={{ auth }}
    />
  )
}
```

**Use in protected routes:**

```typescript
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
})
```

### Redirect After Login

```typescript
// routes/login.tsx
export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LoginComponent,
})

function LoginComponent() {
  const { redirect } = Route.useSearch()
  const router = useRouter()

  const handleLogin = async () => {
    await login()
    router.history.push(redirect || '/')
  }

  return <LoginForm onSubmit={handleLogin} />
}
```

### Non-Redirect Authentication

Render login inline without navigation:

```typescript
export const Route = createFileRoute('/_authenticated')({
  component: () => {
    const { auth } = Route.useRouteContext()

    if (!auth.isAuthenticated) {
      return <Login />
    }

    return <Outlet />
  },
})
```

### Role-Based Access Control

```typescript
export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
    if (context.auth.user?.role !== 'admin') {
      throw redirect({ to: '/unauthorized' })
    }
  },
})
```

---

## Nested Routes and Layouts

TanStack Router uses nested routing with the `Outlet` component to compose layouts.

### Layout Routes

Layout routes wrap child routes with shared UI:

```typescript
// routes/app.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  )
}
```

### Pathless Layout Routes

Use `_` prefix for layouts without affecting URL paths:

```
routes/
├── _layout.tsx           # Wraps children, no URL segment
├── _layout/
│   ├── dashboard.tsx     # /dashboard
│   └── settings.tsx      # /settings
```

```typescript
// routes/_layout.tsx
export const Route = createFileRoute('/_layout')({
  component: () => (
    <div className="authenticated-layout">
      <Header />
      <Outlet />
      <Footer />
    </div>
  ),
})
```

### Route Groups

Use `(folder)` for organizational grouping without URL impact:

```
routes/
├── (auth)/
│   ├── login.tsx         # /login
│   └── register.tsx      # /register
├── (dashboard)/
│   ├── overview.tsx      # /overview
│   └── analytics.tsx     # /analytics
```

### Non-Nested Routes

Use `_` suffix to escape parent nesting:

```
routes/
├── posts.tsx             # /posts (layout)
├── posts.$postId.tsx     # /posts/:postId (nested under posts)
├── posts_.$postId.edit.tsx  # /posts/:postId/edit (NOT nested under posts)
```

### Multiple Root Layouts

```
routes/
├── __root.tsx
├── _public.tsx           # Public layout
├── _public/
│   ├── index.tsx         # /
│   └── about.tsx         # /about
├── _dashboard.tsx        # Dashboard layout
├── _dashboard/
│   ├── home.tsx          # /home
│   └── settings.tsx      # /settings
```

### Outlet Component

The `Outlet` component renders child route content:

```typescript
import { Outlet, Link } from '@tanstack/react-router'

function RootLayout() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </>
  )
}
```

---

## Link Component and Navigation

TanStack Router provides type-safe navigation through components and hooks.

### Link Component

```typescript
import { Link } from '@tanstack/react-router'

// Basic link
<Link to="/about">About</Link>

// With path params
<Link to="/posts/$postId" params={{ postId: '123' }}>
  View Post
</Link>

// With search params
<Link to="/products" search={{ page: 2, filter: 'active' }}>
  Products Page 2
</Link>

// Relative navigation
<Link to="." search={(prev) => ({ ...prev, page: prev.page + 1 })}>
  Next Page
</Link>
```

### Active State Styling

```typescript
<Link
  to="/dashboard"
  activeProps={{
    className: 'active',
    style: { fontWeight: 'bold' },
  }}
  inactiveProps={{
    className: 'inactive',
  }}
>
  Dashboard
</Link>
```

### useNavigate Hook

For imperative navigation:

```typescript
import { useNavigate } from '@tanstack/react-router'

function MyComponent() {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate({
      to: '/posts/$postId',
      params: { postId: '123' },
      search: { tab: 'comments' },
    })
  }

  const goBack = () => {
    navigate({ to: '..', replace: true })
  }

  return (
    <>
      <button onClick={handleClick}>View Post</button>
      <button onClick={goBack}>Go Back</button>
    </>
  )
}
```

### Navigate Component

For immediate navigation on mount:

```typescript
import { Navigate } from '@tanstack/react-router'

function RedirectComponent() {
  return (
    <Navigate
      to="/posts/$postId"
      params={{ postId: 'my-first-post' }}
    />
  )
}
```

### router.navigate()

For navigation outside React components:

```typescript
const router = createRouter({ routeTree })

// Later, anywhere in your app
router.navigate({
  to: '/posts/$postId',
  params: { postId: '123' },
})
```

### Reusable Link Options

```typescript
import { linkOptions } from '@tanstack/react-router'

const dashboardLink = linkOptions({
  to: '/dashboard',
  search: { view: 'overview' },
})

// Use with Link
<Link {...dashboardLink}>Dashboard</Link>

// Use with navigate
navigate(dashboardLink)

// Use with redirect
throw redirect(dashboardLink)
```

### Navigation Options

```typescript
navigate({
  to: '/posts',
  // Replace history entry instead of push
  replace: true,
  // Reset scroll position
  resetScroll: true,
  // Custom state
  state: { fromButton: true },
  // View transition API
  viewTransition: true,
})
```

---

## Code Splitting and Lazy Loading

TanStack Router provides automatic code splitting for optimal performance.

### Automatic Code Splitting

Enable via bundler plugin:

```typescript
// vite.config.ts
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      autoCodeSplitting: true,
    }),
    react(),
  ],
})
```

### Critical vs Non-Critical Code

**Critical (loaded immediately):**
- Path parsing and serialization
- Search parameter validation
- Loaders and beforeLoad hooks
- Route context and static data

**Non-Critical (lazy loaded):**
- Route components
- Error, pending, and not-found components

### .lazy.tsx Pattern

Split routes into two files:

**Main route file (critical):**
```typescript
// routes/posts.$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
})
```

**Lazy file (non-critical):**
```typescript
// routes/posts.$postId.lazy.tsx
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/posts/$postId')({
  component: PostComponent,
  errorComponent: PostError,
  pendingComponent: PostLoading,
})

function PostComponent() {
  const post = Route.useLoaderData()
  return <article>{post.content}</article>
}
```

### Code-Based Lazy Loading

```typescript
import { createRoute, lazyRouteComponent } from '@tanstack/react-router'

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  component: lazyRouteComponent(() => import('./PostsComponent')),
})
```

### Virtual Routes

For empty route files, TanStack Router auto-generates virtual routes as anchors for code-split files.

---

## Devtools

TanStack Router includes dedicated devtools for debugging and visualization.

### Installation

```bash
npm install @tanstack/react-router-devtools
```

### Basic Setup (Floating Mode)

```typescript
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// In your root route
export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
```

### Configuration Options

```typescript
<TanStackRouterDevtools
  router={router}                    // Router instance
  initialIsOpen={false}              // Default open state
  position="bottom-left"             // Corner placement
  toggleButtonProps={{               // Toggle button customization
    style: { marginBottom: '20px' }
  }}
  panelProps={{                      // Panel customization
    style: { maxHeight: '50vh' }
  }}
/>
```

### Embedded Mode

```typescript
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

function DevtoolsSection() {
  return (
    <div className="devtools-container">
      <TanStackRouterDevtoolsPanel router={router} />
    </div>
  )
}
```

### Production Usage

By default, devtools are hidden in production. Use the production variant if needed:

```typescript
import { TanStackRouterDevtoolsInProd } from '@tanstack/react-router-devtools'

<TanStackRouterDevtoolsInProd />
```

---

## Comparison with React Router

### Feature Comparison Table

| Feature | TanStack Router | React Router |
|---------|-----------------|--------------|
| **Type Safety** | Full inference, compile-time checks | Limited |
| **File-Based Routing** | Yes | Yes |
| **Code-Based Routing** | Yes | Yes |
| **Virtual File Routes** | Yes | Yes |
| **Search Params Type Safety** | Yes | No |
| **Search Params Schema Validation** | Yes | No |
| **Custom Search Param Serialization** | Yes | Custom code required |
| **Path Param Validation** | Yes | No |
| **Custom Param Parsing** | Yes | No |
| **SWR Loader Caching** | Yes | No |
| **Search Param Middleware** | Yes | No |
| **Element Scroll Restoration** | Yes | No |
| **Navigation Blocking** | Yes | Limited |
| **Devtools** | Official | Community |
| **React Server Components** | No | Experimental |
| **Form API** | No | Yes |

### When to Choose TanStack Router

- TypeScript-first development
- Complex search parameter state
- Need for schema validation
- Dashboard/admin applications
- Client-heavy SPAs
- Greenfield projects

### When to Choose React Router

- Existing React Router codebase
- Need React Server Components
- Progressive enhancement priority
- Simpler routing requirements
- Form-heavy applications

### Key Differentiators

**TanStack Router Advantages:**
- 100% type-safe without manual type assertions
- First-class search params as state
- Built-in SWR caching
- Schema validation for params/search
- Official devtools

**React Router Advantages:**
- Larger community and ecosystem
- React Server Components support
- Built-in Form API
- Longer track record

---

## Best Practices and Patterns

### File Structure

Organize by feature with colocation:

```
routes/
├── __root.tsx
├── _layout.tsx
├── _layout/
│   ├── dashboard/
│   │   ├── route.tsx           # Critical: loader, beforeLoad
│   │   ├── route.lazy.tsx      # Lazy: component
│   │   └── -components/        # Colocated, excluded from routing
│   │       ├── DashboardCard.tsx
│   │       └── DashboardChart.tsx
│   └── settings/
│       ├── route.tsx
│       └── route.lazy.tsx
```

### URL as State Pattern

Use search params for shareable, bookmarkable state:

```typescript
// Instead of React state
const [filters, setFilters] = useState({})

// Use search params
const { page, filter, sort } = Route.useSearch()

<Link
  to="."
  search={(prev) => ({ ...prev, filter: 'active' })}
>
  Filter Active
</Link>
```

**Good candidates for URL state:**
- Pagination
- Filters and sorting
- Tab selection
- Modal open/close (in some cases)
- Search queries

### Authentication Pattern

```
routes/
├── __root.tsx
├── _auth.tsx              # Redirects authenticated users away
├── _auth/
│   ├── login.tsx
│   └── register.tsx
├── _authenticated.tsx     # Requires authentication
├── _authenticated/
│   ├── dashboard.tsx
│   └── settings.tsx
```

### Data Loading Strategy

**Use router loaders for:**
- Route-specific data
- Data needed immediately on navigation
- Critical path data

**Use TanStack Query for:**
- Shared/cached data across routes
- Background refetching
- Mutations
- Optimistic updates

**Combined approach:**

```typescript
// Prefetch with Query, consume with Suspense
export const Route = createFileRoute('/posts')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(postsQueryOptions()),
})

function PostsComponent() {
  const { data } = useSuspenseQuery(postsQueryOptions())
  return <PostsList posts={data} />
}
```

### Performance Optimization

**Avoid:**
- Updating URL too frequently (e.g., on every keystroke)
- Heavy computation in beforeLoad
- Blocking loaders for non-critical data

**Do:**
- Use deferred loading for non-critical data
- Debounce search param updates
- Preload on hover/focus

```typescript
// Preload on hover
<Link to="/posts/$postId" params={{ postId }} preload="intent">
  View Post
</Link>
```

### Error Boundaries

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId)
    if (!post) {
      throw notFound()
    }
    return post
  },
  errorComponent: ({ error, reset }) => (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  ),
  notFoundComponent: () => (
    <div>
      <h2>Post Not Found</h2>
      <Link to="/posts">Back to Posts</Link>
    </div>
  ),
})
```

### Navigation Blocking

Prevent navigation with unsaved changes:

```typescript
import { useBlocker } from '@tanstack/react-router'

function EditForm() {
  const [isDirty, setIsDirty] = useState(false)

  useBlocker({
    condition: isDirty,
    blockerFn: () =>
      window.confirm('You have unsaved changes. Are you sure you want to leave?'),
  })

  return <form>{/* ... */}</form>
}
```

---

## Resources

### Official Documentation
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Quick Start Guide](https://tanstack.com/router/v1/docs/framework/react/quick-start)
- [API Reference](https://tanstack.com/router/latest/docs/api)

### Examples
- [Basic File-Based Example](https://tanstack.com/router/latest/docs/framework/react/examples/basic-file-based)
- [Authenticated Routes Example](https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes)
- [TanStack Query Integration](https://tanstack.com/router/latest/docs/framework/react/examples/react-query)

### Community Resources
- [TkDodo's Blog: The Beauty of TanStack Router](https://tkdodo.eu/blog/the-beauty-of-tan-stack-router)
- [TkDodo's Blog: Context Inheritance in TanStack Router](https://tkdodo.eu/blog/context-inheritance-in-tan-stack-router)
- [GitHub Discussions](https://github.com/TanStack/router/discussions)

### Video Tutorials
- [Frontend Masters: Loading Data with TanStack Router](https://frontendmasters.com/blog/tanstack-router-data-loading-1/)
- [egghead.io: TanStack Router Courses](https://egghead.io)
