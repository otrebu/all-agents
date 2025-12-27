# Better Auth with TanStack Start: SSR Authentication Patterns

Comprehensive guide for implementing server-side authentication in TanStack Start applications using Better Auth.

## Table of Contents

1. [Overview](#overview)
2. [Core Setup](#core-setup)
3. [Server-Side Session Handling](#server-side-session-handling)
4. [Route Protection](#route-protection)
5. [Server Functions with Auth](#server-functions-with-auth)
6. [Cookie Configuration](#cookie-configuration)
7. [SSR and Hydration](#ssr-and-hydration)
8. [Middleware Patterns](#middleware-patterns)
9. [Protected API Routes](#protected-api-routes)
10. [Auth Redirects](#auth-redirects)
11. [CSRF Protection](#csrf-protection)
12. [Performance Optimization](#performance-optimization)
13. [Common Patterns](#common-patterns)
14. [Troubleshooting](#troubleshooting)

---

## Overview

Better Auth is a TypeScript-first authentication library that implements traditional cookie-based session management. When combined with TanStack Start, it provides full SSR support with proper hydration, eliminating authentication state flicker.

### Key Features

- Cookie-based session management with automatic refresh
- SSR-compatible session validation
- Built-in CSRF protection
- Support for email/password and OAuth providers
- Stateless session mode with cookie caching
- Cross-subdomain cookie support

### Architecture

```
Browser Request
    │
    ▼
TanStack Start Server
    │
    ├── beforeLoad / Middleware
    │   └── auth.api.getSession({ headers })
    │
    ├── Server Functions (createServerFn)
    │   └── Cookie forwarding for auth checks
    │
    └── Route Handlers (/api/auth/$)
        └── auth.handler(request)
```

---

## Core Setup

### 1. Install Dependencies

```bash
npm install better-auth
# or
pnpm add better-auth
# or
bun add better-auth
```

### 2. Server Configuration

Create your auth instance with the TanStack Start cookie plugin:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
  // Database adapter (required)
  database: {
    // Your database configuration
  },

  // Enable email/password auth
  emailAndPassword: {
    enabled: true,
    // autoSignIn: false, // Disable auto sign-in after registration
  },

  // Social providers (optional)
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // TanStack Start cookie plugin - MUST be last in plugins array
  plugins: [tanstackStartCookies()],
});

export type Auth = typeof auth;
```

### 3. Client Configuration

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.VITE_API_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession
} = authClient;
```

### 4. Route Handler

Create the API route that handles all auth requests:

```typescript
// src/routes/api/auth/$.ts
import { auth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
```

---

## Server-Side Session Handling

### The getSession API

Better Auth provides `auth.api.getSession()` for server-side session validation. It requires the request headers to validate the session cookie.

```typescript
import { auth } from "@/lib/auth";

// In a server context
const session = await auth.api.getSession({
  headers: requestHeaders, // Headers object from the request
});

if (session) {
  console.log("User:", session.user);
  console.log("Session:", session.session);
}
```

### Session Data Structure

```typescript
interface Session {
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}
```

### Server Function for Session Access

When you need to access the session from a loader or server function, forward the original request cookies:

```typescript
// lib/auth-server.ts
import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";
import { auth } from "./auth";

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  const event = getEvent();

  const session = await auth.api.getSession({
    headers: new Headers({
      Cookie: event.headers.get("Cookie") || "",
    }),
  });

  return session?.user || null;
});

// Alternative using getRequestHeaders
import { getRequestHeaders } from "@tanstack/react-start/server";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();

  const session = await auth.api.getSession({ headers });

  return session;
});
```

### Using in Route Loaders

```typescript
// routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { getUser } from "@/lib/auth-server";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const user = await getUser();
    return { user };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useLoaderData();
  return <div>Welcome, {user?.name}</div>;
}
```

---

## Route Protection

### Pattern 1: Layout Route with beforeLoad

Create a layout route that protects all child routes:

```typescript
// routes/_authed.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUser } from "@/lib/auth-server";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const user = await getUser();

    if (!user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // Pass user to child routes via context
    return { user };
  },
});
```

Child routes automatically receive the user context:

```typescript
// routes/_authed/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  return <h1>Welcome, {user.name}!</h1>;
}
```

### Pattern 2: Individual Route Protection

```typescript
// routes/settings.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-server";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    // Optional: Check for specific roles
    if (session.user.role !== "admin") {
      throw redirect({ to: "/unauthorized" });
    }

    return { session };
  },
  component: SettingsPage,
});
```

### Pattern 3: Using Server Middleware

```typescript
// lib/middleware/auth.ts
import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const authMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return next({
      context: {
        user: session.user,
        session: session.session,
      },
    });
  }
);
```

Apply to routes:

```typescript
// routes/dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware } from "@/lib/middleware/auth";

export const Route = createFileRoute("/dashboard")({
  server: {
    middleware: [authMiddleware],
  },
  component: Dashboard,
});
```

---

## Server Functions with Auth

### Protected Server Functions

```typescript
// lib/server/posts.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/middleware/auth";

// Read operation - protected
export const getPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { user } = context;

    return db.posts.findMany({
      where: { userId: user.id },
    });
  });

// Write operation - protected with validation
export const createPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      title: z.string().min(1).max(100),
      content: z.string().min(1),
    })
  )
  .handler(async ({ data, context }) => {
    const { user } = context;

    return db.posts.create({
      data: {
        ...data,
        userId: user.id,
      },
    });
  });
```

### Using in Components

```typescript
import { useServerFn } from "@tanstack/react-start";
import { createPost } from "@/lib/server/posts";

function CreatePostForm() {
  const createPostFn = useServerFn(createPost);

  const handleSubmit = async (formData: FormData) => {
    const result = await createPostFn({
      data: {
        title: formData.get("title") as string,
        content: formData.get("content") as string,
      },
    });

    if (result.error) {
      // Handle error
    }
  };

  return (
    <form action={handleSubmit}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### Role-Based Authorization Middleware

```typescript
// lib/middleware/roles.ts
import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { authMiddleware } from "./auth";

type Role = "user" | "moderator" | "admin";

const roleHierarchy: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

export function requireRole(minimumRole: Role) {
  return createMiddleware()
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      const userRole = context.user.role as Role;

      if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
        throw redirect({ to: "/unauthorized" });
      }

      return next();
    });
}

// Usage
export const adminOnlyFn = createServerFn({ method: "POST" })
  .middleware([requireRole("admin")])
  .handler(async ({ context }) => {
    // Only admins reach here
  });
```

---

## Cookie Configuration

### Default Cookie Settings

Better Auth uses these default cookie settings:

| Cookie | Purpose |
|--------|---------|
| `better-auth.session_token` | Active session token |
| `better-auth.session_data` | Cached session data (when enabled) |
| `better-auth.dont_remember` | Remember-me flag |

### Custom Cookie Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  advanced: {
    // Custom cookie prefix
    cookiePrefix: "myapp",

    // Cookie options
    cookieOptions: {
      session_token: {
        name: "auth-token", // Custom name
        attributes: {
          sameSite: "strict",
          secure: true,
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },

    // Force secure cookies in all environments
    useSecureCookies: true,
  },
});
```

### Cross-Subdomain Cookies

Enable cookie sharing across subdomains:

```typescript
export const auth = betterAuth({
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: ".example.com", // Cookies shared across *.example.com
    },
  },
});
```

**Security Warning:** Limit domain scope and vet all subdomains for security risks.

### Session Expiration Configuration

```typescript
export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (in seconds)
    updateAge: 60 * 60 * 24,     // Refresh after 1 day

    // Disable automatic refresh
    // disableSessionRefresh: true,

    // Fresh session requirements for sensitive operations
    freshAge: 60 * 5, // 5 minutes (0 to disable)
  },
});
```

---

## SSR and Hydration

### The Hydration Challenge

Authentication state must be consistent between server render and client hydration:

1. Server renders with auth state from cookies
2. Auth state serialized in rendered HTML
3. Client hydrates with same auth state
4. Client updates auth state on subsequent navigations
5. No hydration mismatch occurs

### Cross-Subdomain SSR Issue

When your auth server runs on a different subdomain (e.g., `api.domain.com`), direct server-to-server requests don't include browser cookies, causing auth state flicker.

**Problem:**

```typescript
// This won't work - no cookies in server-to-server request
const session = await authClient.getSession();
```

**Solution: Forward Cookies via Server Function**

```typescript
// lib/auth-server.ts
import { createServerFn } from "@tanstack/react-start";
import { getEvent } from "vinxi/http";
import { authClient } from "./auth-client";

export const fetchUser = createServerFn({ method: "GET" }).handler(async () => {
  const event = getEvent();

  // Forward the browser's cookies to the auth server
  const session = await authClient.getSession({
    fetchOptions: {
      headers: {
        Cookie: event.headers.get("Cookie") || "",
      },
    },
  });

  return session.data?.user || null;
});
```

### Selective SSR for Auth-Heavy Routes

Use TanStack Start's selective SSR when components cause hydration issues:

```typescript
// routes/profile.tsx
export const Route = createFileRoute("/profile")({
  // Options:
  // ssr: true       - Full SSR (default)
  // ssr: 'data-only' - Loader runs on server, component renders on client
  // ssr: false      - Pure SPA mode

  ssr: "data-only", // Fetch auth data on server, render on client

  loader: async () => {
    const user = await getUser();
    return { user };
  },
});
```

### Client-Only Auth UI

Wrap auth-dependent UI that doesn't need SEO:

```typescript
import { ClientOnly } from "@tanstack/react-start";

function Header() {
  return (
    <header>
      <Logo />
      <ClientOnly>
        <UserMenu />
      </ClientOnly>
    </header>
  );
}

function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Skeleton />;
  if (!session) return <LoginButton />;

  return <ProfileDropdown user={session.user} />;
}
```

---

## Middleware Patterns

### Global Request Middleware

Apply authentication check to all requests:

```typescript
// src/start.ts
import { createStart } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/middleware/auth";

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware],
}));
```

### Global Server Function Middleware

Apply to all server functions:

```typescript
// src/start.ts
import { createStart } from "@tanstack/react-start";
import { loggingMiddleware } from "@/lib/middleware/logging";

export const startInstance = createStart(() => ({
  functionMiddleware: [loggingMiddleware],
}));
```

### Middleware Composition

Chain middleware with dependencies:

```typescript
// lib/middleware/index.ts
import { createMiddleware } from "@tanstack/react-start";

// Logging middleware
const loggingMiddleware = createMiddleware().server(async ({ next }) => {
  const start = Date.now();
  const result = await next();
  console.log(`Request took ${Date.now() - start}ms`);
  return result;
});

// Auth middleware that depends on logging
export const authMiddleware = createMiddleware()
  .middleware([loggingMiddleware])
  .server(async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    return next({
      context: { session },
    });
  });

// Role middleware that depends on auth
export const adminMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.session?.user.role !== "admin") {
      throw redirect({ to: "/unauthorized" });
    }
    return next();
  });
```

### Input Validation Middleware

```typescript
import { createMiddleware } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

export const workspaceMiddleware = createMiddleware({ type: "function" })
  .inputValidator(
    zodValidator(
      z.object({
        workspaceId: z.string().uuid(),
      })
    )
  )
  .server(async ({ next, data }) => {
    const workspace = await db.workspace.findUnique({
      where: { id: data.workspaceId },
    });

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    return next({
      context: { workspace },
    });
  });
```

---

## Protected API Routes

### Server Route Protection

```typescript
// routes/api/posts/$.ts
import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware } from "@/lib/middleware/auth";

export const Route = createFileRoute("/api/posts/$")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ context }) => {
        const posts = await db.posts.findMany({
          where: { userId: context.user.id },
        });
        return Response.json(posts);
      },

      POST: async ({ request, context }) => {
        const body = await request.json();
        const post = await db.posts.create({
          data: {
            ...body,
            userId: context.user.id,
          },
        });
        return Response.json(post, { status: 201 });
      },
    },
  },
});
```

### Per-Method Middleware

```typescript
// routes/api/admin/$.ts
import { createFileRoute } from "@tanstack/react-router";
import { authMiddleware, adminMiddleware } from "@/lib/middleware";

export const Route = createFileRoute("/api/admin/$")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        // Read - any authenticated user
        GET: {
          middleware: [authMiddleware],
          handler: async ({ context }) => {
            return Response.json({ user: context.user });
          },
        },

        // Write - admin only
        POST: {
          middleware: [adminMiddleware],
          handler: async ({ request, context }) => {
            // Admin-only operations
          },
        },
      }),
  },
});
```

### Error Responses

```typescript
import { createMiddleware } from "@tanstack/react-start";

export const apiAuthMiddleware = createMiddleware().server(async ({ next }) => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return Response.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  return next({ context: { session } });
});
```

---

## Auth Redirects

### Sign-In Redirects

```typescript
// Client-side
await signIn.email({
  email: "user@example.com",
  password: "password",
  callbackURL: "/dashboard", // Redirect after successful login
});

// With callbacks
await signIn.email({
  email,
  password,
  fetchOptions: {
    onSuccess: () => {
      router.navigate({ to: "/dashboard" });
    },
    onError: (error) => {
      setError(error.message);
    },
  },
});
```

### OAuth Redirects

```typescript
await signIn.social({
  provider: "github",
  callbackURL: "/dashboard",        // Success redirect
  errorCallbackURL: "/login?error=oauth", // Error redirect
  newUserCallbackURL: "/onboarding", // First-time user redirect
});
```

### Redirect After Protected Route Access

```typescript
// routes/_authed.tsx
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const user = await getUser();

    if (!user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href, // Preserve intended destination
        },
      });
    }

    return { user };
  },
});

// routes/login.tsx
import { useSearch } from "@tanstack/react-router";

function LoginPage() {
  const { redirect: redirectTo } = useSearch({ from: "/login" });

  const handleLogin = async () => {
    await signIn.email({
      email,
      password,
      callbackURL: redirectTo || "/dashboard",
    });
  };

  // ...
}
```

### Sign-Out Redirect

```typescript
await signOut({
  fetchOptions: {
    onSuccess: () => {
      router.navigate({ to: "/" });
    },
  },
});
```

---

## CSRF Protection

### Built-in Protection

Better Auth includes multiple CSRF defenses by default:

1. **Non-Simple Requests**: Only allows requests with `Content-Type: application/json`
2. **Origin Validation**: Verifies request origin against trusted sources
3. **SameSite Cookies**: Uses `SameSite=Lax` by default
4. **State/Nonce Validation**: For OAuth callbacks

### Trusted Origins Configuration

```typescript
export const auth = betterAuth({
  // Basic configuration
  trustedOrigins: [
    "https://example.com",
    "https://app.example.com",
    "http://localhost:3000",
  ],

  // Wildcard patterns
  trustedOrigins: [
    "*.example.com",
    "https://*.example.com",
  ],

  // Custom schemes (mobile apps, extensions)
  trustedOrigins: [
    "myapp://",
    "chrome-extension://YOUR_EXTENSION_ID",
  ],

  // Dynamic origins
  trustedOrigins: async (request) => {
    const domains = await db.trustedDomains.findMany();
    return domains.map((d) => d.origin);
  },
});
```

### OAuth Security

Better Auth stores OAuth state and PKCE in the database:

- **State**: Prevents CSRF attacks during OAuth flow
- **PKCE**: Protects against authorization code injection

These are automatically validated and cleaned up after the OAuth flow completes.

### Disabling CSRF Checks (Not Recommended)

```typescript
export const auth = betterAuth({
  advanced: {
    // WARNING: Opens your app to CSRF attacks
    disableCSRFCheck: true,

    // WARNING: May enable open redirects
    disableOriginCheck: true,
  },
});
```

---

## Performance Optimization

### Cookie Caching

Reduce database queries by caching session data in a signed cookie:

```typescript
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes

      // Encoding strategies:
      // 'compact' - Smallest size, default
      // 'jwt'     - Standard JWT, good for third-party integration
      // 'jwe'     - Encrypted, maximum security
      strategy: "compact",
    },
  },
});
```

### Stateless Sessions

For high-traffic applications, use fully stateless sessions:

```typescript
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      strategy: "jwe",          // Encrypted
      refreshCache: true,       // Auto-refresh at 80% of maxAge
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
});
```

### Session Versioning (Stateless)

Invalidate all sessions on deployment:

```typescript
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      version: "2", // Change to invalidate all existing sessions
    },
  },
});
```

### Hybrid: Cookie Cache + Redis

Best of both worlds - fast validation with revocation support:

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export const auth = betterAuth({
  secondaryStorage: {
    get: async (key) => redis.get(key),
    set: async (key, value, ttl) => redis.set(key, value, "EX", ttl),
    delete: async (key) => redis.del(key),
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,      // 5-minute cookie cache
      refreshCache: false,  // Redis handles updates
    },
  },
});
```

### Disable Cookie Cache for Specific Requests

```typescript
// Force database fetch
const session = await authClient.getSession({
  query: { disableCookieCache: true },
});
```

---

## Common Patterns

### Auth Provider for React Context

```typescript
// components/auth-provider.tsx
import { createContext, useContext, ReactNode } from "react";
import { useSession } from "@/lib/auth-client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isLoading: isPending,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### TanStack Query Integration

```typescript
// hooks/use-auth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(["session"], null);
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
```

### Custom Session Data

Extend session with additional fields:

```typescript
// Server
import { customSession } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    customSession(async ({ user, session }) => {
      const roles = await db.userRoles.findMany({
        where: { userId: user.id },
      });

      return {
        user: {
          ...user,
          roles: roles.map((r) => r.name),
        },
        session,
      };
    }),
  ],
});

// Client
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [customSessionClient<typeof auth>()],
});

// Usage
const { data } = useSession();
console.log(data?.user.roles); // Properly typed
```

### Remember Me Functionality

```typescript
// Sign in with remember me
await signIn.email({
  email,
  password,
  rememberMe: true, // Default: true
});

// Sign in without remember me (session ends when browser closes)
await signIn.email({
  email,
  password,
  rememberMe: false,
});
```

---

## Troubleshooting

### Session is null on server

**Cause:** Headers not properly forwarded to `getSession`.

**Solution:**

```typescript
// Correct
const headers = getRequestHeaders();
const session = await auth.api.getSession({ headers });

// Also correct (manual cookie forwarding)
const event = getEvent();
const session = await auth.api.getSession({
  headers: new Headers({
    Cookie: event.headers.get("Cookie") || "",
  }),
});
```

### Hydration mismatch with auth state

**Cause:** Server and client have different auth states.

**Solutions:**

1. Pre-fetch session in loader and pass to component
2. Use `ClientOnly` for auth-dependent UI
3. Use `ssr: 'data-only'` for the route

### useSession not updating after sign-in

**Cause:** Server-side auth actions don't trigger client hook updates.

**Solution:**

```typescript
// Option 1: Manual refetch
const { refetch } = useSession();
await signIn.email({ ... });
await refetch();

// Option 2: Page reload
await signIn.email({
  fetchOptions: {
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
  },
});
```

### CORS errors with OAuth

**Cause:** Redirect URI mismatch or missing trusted origins.

**Solution:**

```typescript
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, // Must match OAuth redirect URI
  trustedOrigins: [
    process.env.FRONTEND_URL,
    // Add all origins that initiate auth
  ],
});
```

### Cross-subdomain cookies not working

**Cause:** Cookie domain not properly configured.

**Solution:**

```typescript
export const auth = betterAuth({
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: ".example.com", // Note the leading dot
    },
    useSecureCookies: true, // Required for cross-subdomain
  },
});
```

---

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [TanStack Start Integration](https://www.better-auth.com/docs/integrations/tanstack)
- [Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [Cookie Configuration](https://www.better-auth.com/docs/concepts/cookies)
- [Security Reference](https://www.better-auth.com/docs/reference/security)
- [TanStack Start Authentication Guide](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [TanStack Start Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [SSR Authentication Across Subdomains](https://dev.to/simonxabris/ssr-authentication-across-subdomains-using-tanstack-start-and-better-auth-21hg)
