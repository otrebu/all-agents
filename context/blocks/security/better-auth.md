---
depends: []
---

# Better Auth

Framework-agnostic TypeScript auth library. Runs on any JS runtime.

## Quick Start

```bash
# install
better-auth
```

## Server Setup

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    type: "postgres", // or sqlite, mysql
    url: process.env.DATABASE_URL,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh after 1 day
  },
});

export type Session = typeof auth.$Infer.Session;
```

## API Handler

```typescript
// Fastify
app.all("/api/auth/*", async (request, reply) => {
  return auth.handler(request.raw);
});

// Express
app.all("/api/auth/*", toNodeHandler(auth));

// Hono
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

## Client Setup

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.VITE_API_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

## Social Providers

```typescript
// Server
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});

// Client
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});
```

## Database Schema

Auto-generates tables: `user`, `session`, `account`, `verification`.

```bash
npx better-auth generate  # Generate migrations
npx better-auth migrate   # Apply migrations
```

## Plugins

```typescript
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    twoFactor({
      issuer: "MyApp",
    }),
  ],
});
```

Available: `twoFactor`, `passkey`, `magicLink`, `organization`, `admin`.

## When to Use

| Scenario | Better Auth | Auth.js | Clerk/Auth0 |
|----------|-------------|---------|-------------|
| Self-hosted | Yes | Yes | No |
| TypeScript-first | Yes | Partial | Yes |
| Customization | High | Medium | Low |
| Cost | Free | Free | Paid at scale |
| Database control | Full | Full | None |

Better Auth = self-hosted, type-safe, extensible auth. ~15KB client.
