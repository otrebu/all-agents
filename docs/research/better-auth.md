# Better Auth - Comprehensive Research Documentation

> Modern TypeScript Authentication Framework

**Version:** 1.4.9 (as of December 2025)
**License:** MIT
**Repository:** [github.com/better-auth/better-auth](https://github.com/better-auth/better-auth)
**Documentation:** [better-auth.com](https://www.better-auth.com/)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts & Architecture](#core-concepts--architecture)
3. [Installation & Setup](#installation--setup)
4. [Database Configuration](#database-configuration)
5. [Authentication Methods](#authentication-methods)
6. [Session Management](#session-management)
7. [OAuth & Social Sign-On](#oauth--social-sign-on)
8. [Email Verification & Password Reset](#email-verification--password-reset)
9. [Two-Factor Authentication](#two-factor-authentication)
10. [Plugins Ecosystem](#plugins-ecosystem)
11. [Security Best Practices](#security-best-practices)
12. [Framework Integrations](#framework-integrations)
13. [Migration from Auth.js/NextAuth](#migration-from-authjsnextauth)
14. [Comparison: Better Auth vs Auth.js](#comparison-better-auth-vs-authjs)
15. [References](#references)

---

## Overview

Better Auth is a **framework-agnostic, universal authentication and authorization framework for TypeScript**. It provides comprehensive built-in features and a plugin ecosystem that simplifies adding advanced functionalities like 2FA, passkeys, multi-tenancy, and SSO.

### Key Features

- **Email/Password Authentication** with session and account management
- **OAuth 2.0 & OpenID Connect** support for 20+ providers
- **Two-Factor Authentication** (TOTP, OTP, backup codes)
- **Passkey/WebAuthn** support for passwordless login
- **Multi-Tenant Organizations** with teams, invitations, and RBAC
- **Plugin Architecture** for extensibility
- **Full TypeScript Support** with automatic type inference
- **Framework Agnostic** - works with Next.js, Nuxt, SvelteKit, Astro, Hono, and more

### Adoption

Better Auth is the recommended auth library by Next.js, Nuxt, Astro, and other top JS frameworks. Since launching v1, it has gained 24K+ GitHub stars and 350K+ monthly npm downloads. Auth.js (formerly NextAuth.js) is now maintained and overseen by the Better Auth team.

---

## Core Concepts & Architecture

### Architecture Overview

Better Auth follows a client-server architecture:

1. **Server Instance (`betterAuth`)**: Handles authentication logic, database operations, and session management
2. **Client Instance (`createAuthClient`)**: Provides frontend hooks and methods for authentication flows
3. **Plugin System**: Extends both server and client with additional functionality
4. **Database Layer**: Stores users, sessions, accounts, and verification data

### Core Tables

Better Auth requires four primary database tables:

| Table | Purpose |
|-------|---------|
| **user** | Stores user profiles (id, name, email, emailVerified, image, timestamps) |
| **session** | Manages active sessions (id, userId, token, expiresAt, ipAddress, userAgent) |
| **account** | Links authentication providers to users (OAuth tokens, passwords) |
| **verification** | Handles verification tokens (email verification, password reset) |

### Type Safety

Better Auth is built with TypeScript throughout. Enable strict mode in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Access inferred types via the `$Infer` property:

```typescript
// Server-side
type Session = typeof auth.$Infer.Session

// Client-side
type Session = typeof authClient.$Infer.Session
```

---

## Installation & Setup

### 1. Install Package

```bash
# npm
npm install better-auth

# pnpm
pnpm add better-auth

# yarn
yarn add better-auth

# bun
bun add better-auth
```

> **Note:** Install in both client and server if using a monorepo structure.

### 2. Environment Variables

Create a `.env` file:

```env
# Required: Secret key (min 32 chars, high entropy)
BETTER_AUTH_SECRET=your-secret-key-here

# Required: Application base URL
BETTER_AUTH_URL=http://localhost:3000
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

### 3. Create Auth Instance

Create `lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  // Database configuration (see Database section)
  database: {
    connectionString: process.env.DATABASE_URL,
    type: "postgres", // or "mysql", "sqlite"
  },

  // Enable email/password auth
  emailAndPassword: {
    enabled: true,
  },

  // Optional: Social providers
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
});
```

### 4. Create Client Instance

Create `lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react"; // or /vue, /svelte, /solid

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL, // Optional if same domain
});
```

### 5. Mount API Handler

**Next.js (App Router)** - `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Hono:**

```typescript
import { Hono } from "hono";
import { auth } from "./auth";

const app = new Hono();
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));
```

**Express:**

```typescript
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const app = express();
app.all("/api/auth/*", toNodeHandler(auth));
```

### 6. Run Database Migration

```bash
# Generate migration files
npx @better-auth/cli generate

# Or apply directly (Kysely only)
npx @better-auth/cli migrate
```

---

## Database Configuration

### Supported Databases

Better Auth supports multiple database systems:

| Database | Adapter |
|----------|---------|
| PostgreSQL | Native (Kysely), Prisma, Drizzle |
| MySQL | Native (Kysely), Prisma, Drizzle |
| SQLite | Native (Kysely), Prisma, Drizzle |
| MongoDB | Dedicated adapter |
| MSSQL | Dedicated adapter |

### Configuration Examples

**PostgreSQL with pg:**

```typescript
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
});
```

**Prisma ORM:**

```typescript
import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "sqlite"
  }),
});
```

**Drizzle ORM:**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
});
```

### Stateless Mode (No Database)

For simple use cases without database:

```typescript
export const auth = betterAuth({
  database: undefined, // Stateless sessions only
  session: {
    type: "stateless",
  },
});
```

> **Note:** Stateless mode has limited plugin support.

### Custom Fields

Extend user and session tables with additional fields:

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Prevent user modification
      },
      plan: {
        type: "string",
        required: false,
      },
    },
  },
  session: {
    additionalFields: {
      deviceId: {
        type: "string",
        required: false,
      },
    },
  },
});
```

### Secondary Storage (Redis)

For high-performance session and rate-limit management:

```typescript
import { createClient } from "redis";

const redis = createClient();
await redis.connect();

export const auth = betterAuth({
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    },
    set: async (key, value, ttl) => {
      await redis.set(key, JSON.stringify(value), { EX: ttl });
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
});
```

---

## Authentication Methods

### Email & Password

**Configuration:**

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,      // Default: 8
    maxPasswordLength: 128,    // Default: 128
    autoSignIn: true,          // Auto sign-in after registration
    requireEmailVerification: true,
  },
});
```

**Sign Up:**

```typescript
const { data, error } = await authClient.signUp.email({
  email: "user@example.com",
  password: "secure-password",
  name: "John Doe",
  image: "https://example.com/avatar.jpg", // Optional
  callbackURL: "/dashboard", // Optional redirect
});
```

**Sign In:**

```typescript
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "secure-password",
  rememberMe: true, // Optional
  callbackURL: "/dashboard",
});
```

**Sign Out:**

```typescript
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      window.location.href = "/";
    },
  },
});
```

### Custom Password Hashing

Replace default scrypt with alternatives:

```typescript
import { hash, verify } from "@node-rs/argon2";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => hash(password),
      verify: async (data) => verify(data.hash, data.password),
    },
  },
});
```

---

## Session Management

### Session Architecture

Better Auth uses **cookie-based session management** where sessions are stored in the database and validated server-side on each request.

### Configuration Options

```typescript
export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (default)
    updateAge: 60 * 60 * 24,     // Refresh daily (default)
    freshAge: 60 * 60 * 24,      // Fresh session threshold
    disableSessionRefresh: false,
  },
});
```

### Cookie Caching

Reduce database hits with cookie caching:

```typescript
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
      encoding: "compact", // or "jwt", "jwe"
    },
  },
});
```

**Encoding Options:**

| Mode | Description | Use Case |
|------|-------------|----------|
| `compact` | Base64url + HMAC-SHA256 | Internal use (smallest) |
| `jwt` | Standard HS256 JWT | Third-party compatibility |
| `jwe` | Encrypted A256CBC-HS512 | Maximum security |

### Client-Side Session Access

**React Hook:**

```typescript
import { authClient } from "@/lib/auth-client";

function Component() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome, {session.user.name}</div>;
}
```

**Manual Fetch:**

```typescript
const session = await authClient.getSession();
```

### Server-Side Session Access

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function ServerComponent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return <div>Welcome, {session.user.name}</div>;
}
```

### Session Management Operations

```typescript
// List all active sessions
const sessions = await authClient.listSessions();

// Revoke a specific session
await authClient.revokeSession({ token: "session-token" });

// Revoke all other sessions
await authClient.revokeOtherSessions();

// Revoke all sessions
await authClient.revokeSessions();
```

---

## OAuth & Social Sign-On

### Supported Providers

Better Auth has built-in support for 20+ OAuth providers including:

- Google, GitHub, Apple, Microsoft, Discord
- Twitter/X, Facebook, LinkedIn, Spotify
- Twitch, Slack, GitLab, Bitbucket
- And more via Generic OAuth plugin

### Configuration

```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["email", "profile"], // Optional
      redirectURI: "/api/auth/callback/google", // Optional
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    },
  },
});
```

### Client-Side Sign In

```typescript
// Redirect to OAuth provider
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
  errorCallbackURL: "/error",
  newUserCallbackURL: "/onboarding", // For new users
});
```

### Account Linking

Link additional providers to existing accounts:

```typescript
// Link a social account
await authClient.linkSocial({
  provider: "github",
  callbackURL: "/settings",
});
```

Configure trusted providers for automatic linking:

```typescript
export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
});
```

### Generic OAuth Plugin

For unsupported providers or custom OAuth servers:

```typescript
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId: process.env.KEYCLOAK_CLIENT_ID!,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
          discoveryUrl: "https://auth.example.com/.well-known/openid-configuration",
        },
        {
          providerId: "custom-oauth",
          clientId: "client-id",
          clientSecret: "client-secret",
          authorizationUrl: "https://provider.com/oauth/authorize",
          tokenUrl: "https://provider.com/oauth/token",
          userInfoUrl: "https://provider.com/oauth/userinfo",
        },
      ],
    }),
  ],
});
```

---

## Email Verification & Password Reset

### Email Verification

**Server Configuration:**

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour (default)

    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Send email using your email provider
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `<a href="${url}">Verify Email</a>`,
      });
    },
  },
});
```

**Client-Side:**

```typescript
// Request verification email
await authClient.sendVerificationEmail({
  email: "user@example.com",
  callbackURL: "/dashboard",
});

// Verify token (handled automatically via link, or manually)
await authClient.verifyEmail({
  token: "verification-token",
});
```

### Password Reset

**Server Configuration:**

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 3600, // 1 hour

    sendResetPassword: async ({ user, url, token }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `<a href="${url}">Reset Password</a>`,
      });
    },

    onPasswordReset: async (user) => {
      // Optional: Post-reset logic (e.g., notify user)
    },
  },
});
```

**Client-Side:**

```typescript
// Request password reset
await authClient.requestPasswordReset({
  email: "user@example.com",
  redirectTo: "/reset-password",
});

// Reset password with token
await authClient.resetPassword({
  token: "reset-token",
  newPassword: "new-secure-password",
});
```

### Password Change (Authenticated Users)

```typescript
await authClient.changePassword({
  currentPassword: "old-password",
  newPassword: "new-password",
  revokeOtherSessions: true, // Optional
});
```

---

## Two-Factor Authentication

The 2FA plugin provides TOTP (authenticator apps), OTP (email/SMS), and backup codes.

### Installation

**Server:**

```typescript
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  appName: "My App", // Used as TOTP issuer
  plugins: [
    twoFactor({
      issuer: "My App",
      digits: 6,           // OTP length
      period: 30,          // TOTP time window (seconds)
      backupCodes: {
        length: 10,        // Number of codes
        characters: 10,    // Characters per code
      },
    }),
  ],
});
```

**Client:**

```typescript
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      twoFactorPage: "/two-factor", // Redirect for 2FA verification
    }),
  ],
});
```

### Enable 2FA for User

```typescript
// Step 1: Enable 2FA (generates secret and backup codes)
const { data } = await authClient.twoFactor.enable({
  password: "user-password", // Required for verification
});

// Step 2: Get TOTP URI for QR code
const { totpURI } = await authClient.twoFactor.getTotpUri({
  password: "user-password",
});

// Step 3: Display QR code (use a library like qrcode)
// <QRCode value={totpURI} />

// Step 4: Verify initial TOTP code
await authClient.twoFactor.verifyTotp({
  code: "123456",
});
```

### 2FA Sign-In Flow

When 2FA is enabled, sign-in returns `twoFactorRedirect: true`:

```typescript
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "password",
});

if (data?.twoFactorRedirect) {
  // Redirect to 2FA verification page
  router.push("/two-factor");
}
```

**Verify 2FA:**

```typescript
// TOTP verification
await authClient.twoFactor.verifyTotp({
  code: "123456",
  trustDevice: true, // Skip 2FA for 30 days on this device
});

// Backup code verification
await authClient.twoFactor.verifyBackupCode({
  code: "backup-code",
  trustDevice: true,
});
```

### Backup Codes

```typescript
// Generate new backup codes
const { backupCodes } = await authClient.twoFactor.generateBackupCodes({
  password: "user-password",
});

// Display codes to user for safekeeping
```

### Disable 2FA

```typescript
await authClient.twoFactor.disable({
  password: "user-password",
});
```

---

## Plugins Ecosystem

Better Auth's plugin system extends functionality across server, client, and database layers.

### Core Plugins

| Plugin | Description |
|--------|-------------|
| `twoFactor` | TOTP, OTP, and backup codes |
| `passkey` | WebAuthn/FIDO2 passwordless authentication |
| `organization` | Multi-tenancy with teams and RBAC |
| `magicLink` | Passwordless email link authentication |
| `anonymous` | Guest authentication with account upgrade |
| `emailOTP` | One-time password via email |
| `phoneNumber` | Phone/SMS authentication |
| `username` | Username-based authentication |
| `genericOAuth` | Custom OAuth provider integration |
| `oauthProxy` | OAuth redirect proxy for development |

### Passkey Plugin

```typescript
import { passkey } from "@better-auth/passkey";
import { passkeyClient } from "@better-auth/passkey/client";

// Server
export const auth = betterAuth({
  plugins: [
    passkey({
      rpID: "example.com",
      rpName: "My App",
      origin: "https://example.com",
    }),
  ],
});

// Client
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});

// Register passkey
await authClient.passkey.addPasskey({
  name: "My Device",
});

// Sign in with passkey
await authClient.signIn.passkey({
  autoFill: true, // Enable conditional UI
});
```

### Organization Plugin (Multi-Tenancy)

```typescript
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      membershipLimit: 100,

      sendInvitationEmail: async ({ email, invitationId, organization }) => {
        await sendEmail({
          to: email,
          subject: `Join ${organization.name}`,
          html: `<a href="/invite/${invitationId}">Accept Invitation</a>`,
        });
      },
    }),
  ],
});

// Client usage
await authClient.organization.create({
  name: "My Company",
  slug: "my-company",
});

await authClient.organization.inviteMember({
  email: "member@example.com",
  role: "admin",
});
```

### Magic Link Plugin

```typescript
import { magicLink } from "better-auth/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

// Server
export const auth = betterAuth({
  plugins: [
    magicLink({
      expiresIn: 300, // 5 minutes
      sendMagicLink: async ({ email, url, token }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to My App",
          html: `<a href="${url}">Sign In</a>`,
        });
      },
    }),
  ],
});

// Client
await authClient.signIn.magicLink({
  email: "user@example.com",
  callbackURL: "/dashboard",
});
```

### Anonymous Plugin

```typescript
import { anonymous } from "better-auth/plugins";
import { anonymousClient } from "better-auth/client/plugins";

// Server
export const auth = betterAuth({
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Migrate data from anonymous to registered user
        await migrateUserData(anonymousUser.id, newUser.id);
      },
    }),
  ],
});

// Client
const { user } = await authClient.signIn.anonymous();
// User can now access the app without registration
// Later, they can upgrade their account
```

---

## Security Best Practices

### Password Security

- Default algorithm: **scrypt** (memory-hard, CPU-intensive)
- Minimum length: 8 characters (configurable)
- Maximum length: 128 characters
- Custom hashing supported (Argon2, bcrypt)

### CSRF Protection

Better Auth implements four-layer CSRF defense:

1. **Request Type Validation**: Only accepts `application/json` Content-Type
2. **Origin Verification**: Validates against `trustedOrigins`
3. **Cookie Attributes**: `SameSite=Lax`, `HttpOnly`, `Secure`
4. **GET Safety**: GET requests are read-only; OAuth uses nonce/state validation

```typescript
export const auth = betterAuth({
  trustedOrigins: [
    "https://example.com",
    "https://app.example.com",
    "*.example.com", // Wildcard
    "myapp://", // Mobile deep links
  ],
});
```

### Rate Limiting

```typescript
export const auth = betterAuth({
  rateLimit: {
    enabled: true,        // Default: true in production
    window: 60,           // Time window (seconds)
    max: 100,             // Max requests per window
    storage: "memory",    // or "database", "secondary-storage"

    customRules: {
      "/sign-in/*": {
        window: 10,
        max: 3,
      },
    },
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"], // Cloudflare
    },
  },
});
```

### Cookie Configuration

```typescript
export const auth = betterAuth({
  advanced: {
    useSecureCookies: true, // Force HTTPS
    crossSubDomainCookies: {
      enabled: true,
      domain: ".example.com",
    },
    defaultCookieAttributes: {
      sameSite: "strict", // or "lax", "none"
      httpOnly: true,
      secure: true,
    },
  },
});
```

### Security Headers

Recommended headers for production:

```typescript
// Next.js example
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
```

---

## Framework Integrations

### Next.js (App Router)

**API Route** (`app/api/auth/[...all]/route.ts`):

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Server Components:**

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return <div>Protected content for {session.user.name}</div>;
}
```

**Server Actions with Cookies:**

```typescript
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  plugins: [nextCookies()], // Add as last plugin
});
```

**Middleware (Next.js 15.2+):**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const session = getSessionCookie(request);

  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
  runtime: "nodejs", // Enable for full session validation
};
```

### Hono

```typescript
import { Hono } from "hono";
import { auth } from "./auth";

const app = new Hono();

// Mount auth handler
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Protected route
app.get("/api/protected", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ user: session.user });
});
```

### SvelteKit

```typescript
// hooks.server.ts
import { auth } from "$lib/auth";

export const handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  event.locals.session = session;
  return resolve(event);
};
```

### Nuxt

```typescript
// server/api/auth/[...all].ts
import { auth } from "~/lib/auth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
```

---

## Migration from Auth.js/NextAuth

### Key Differences

| Aspect | Auth.js | Better Auth |
|--------|---------|-------------|
| Design | Provider-centric | Feature-centric |
| TypeScript | Requires type augmentation | Automatic inference |
| 2FA | Not built-in | Plugin included |
| Sessions | JWT or database | Database-first |
| Callbacks | Extensive callback system | Hooks + plugins |

### Migration Steps

1. **Replace Route Handler:**

```typescript
// Before (Auth.js)
import NextAuth from "next-auth";
export const { GET, POST } = NextAuth(authOptions);

// After (Better Auth)
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

2. **Update Client Calls:**

```typescript
// Before
import { signIn, signOut, useSession } from "next-auth/react";
signIn("google");
signOut();

// After
import { authClient } from "@/lib/auth-client";
authClient.signIn.social({ provider: "google" });
authClient.signOut();
```

3. **Database Schema Changes:**

- `emailVerified`: timestamp -> boolean
- `session.sessionToken` -> `session.token`
- `account.provider` -> `account.providerId`
- Add timestamps (`createdAt`, `updatedAt`)

4. **Run Migrations:**

```bash
npx @better-auth/cli migrate
```

---

## Comparison: Better Auth vs Auth.js

### When to Choose Better Auth

- **TypeScript-first projects** - Superior type inference
- **Built-in 2FA requirement** - Native TOTP/OTP support
- **Multi-tenant applications** - Organization plugin
- **Passkey/WebAuthn needs** - First-class support
- **New projects** - Recommended by frameworks

### When to Choose Auth.js

- **Existing Auth.js projects** - Proven stability
- **Simple social login only** - Minimal setup
- **Stateless JWT preference** - Better Auth now supports this too
- **Legacy compatibility** - Established ecosystem

### Feature Comparison

| Feature | Better Auth | Auth.js |
|---------|-------------|---------|
| TypeScript | Native inference | Manual augmentation |
| 2FA/MFA | Built-in plugin | Requires custom |
| Passkeys | Plugin | Limited |
| Organizations | Plugin | Not available |
| Rate Limiting | Built-in | Manual |
| Email OTP | Plugin | Custom |
| Magic Links | Plugin | Custom |

---

## References

### Official Documentation

- [Better Auth Documentation](https://www.better-auth.com/docs/introduction)
- [GitHub Repository](https://github.com/better-auth/better-auth)
- [Installation Guide](https://www.better-auth.com/docs/installation)
- [Plugin Reference](https://www.better-auth.com/docs/concepts/plugins)

### Authentication Concepts

- [Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [Database Configuration](https://www.better-auth.com/docs/concepts/database)
- [OAuth Integration](https://www.better-auth.com/docs/concepts/oauth)
- [Security Reference](https://www.better-auth.com/docs/reference/security)
- [Rate Limiting](https://www.better-auth.com/docs/concepts/rate-limit)

### Plugin Documentation

- [Two-Factor Authentication](https://www.better-auth.com/docs/plugins/2fa)
- [Passkey/WebAuthn](https://www.better-auth.com/docs/plugins/passkey)
- [Organization (Multi-Tenancy)](https://www.better-auth.com/docs/plugins/organization)
- [Magic Link](https://www.better-auth.com/docs/plugins/magic-link)
- [Generic OAuth](https://www.better-auth.com/docs/plugins/generic-oauth)

### Framework Integration

- [Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Migration from Auth.js](https://www.better-auth.com/docs/guides/next-auth-migration-guide)

### Comparison Resources

- [Better Auth vs NextAuth vs Auth0](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/)
- [Auth.js vs BetterAuth for Next.js](https://www.wisp.blog/blog/authjs-vs-betterauth-for-nextjs-a-comprehensive-comparison)
- [BetterAuth vs NextAuth Comparison](https://www.devtoolsacademy.com/blog/betterauth-vs-nextauth/)

---

*Last updated: December 2025*
