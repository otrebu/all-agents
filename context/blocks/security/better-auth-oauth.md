---
depends:
  - "@context/blocks/security/better-auth.md"
tags: [auth]
---

# BetterAuth OAuth & OIDC

BetterAuth as OAuth consumer (social login) and OAuth 2.1 provider (issuing tokens to other apps).

## Two Roles

| Role | What It Does | Package |
|------|-------------|---------|
| **Consumer** (social login) | Your app uses Google, GitHub, etc. to authenticate users | `better-auth` (built-in) |
| **Provider** (authorization server) | Your app issues tokens to other apps | `@better-auth/oauth-provider` (separate) |

Most apps start as consumer only. Add provider when you need to let third-party apps access your API.

## Social Login (Consumer)

Built-in to core. 40+ providers: Google, GitHub, Apple, Discord, Microsoft, Twitter/X, LinkedIn, GitLab, etc.

```typescript
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
})
```

Client-side:

```typescript
await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
```

## Generic OAuth (Consumer)

For providers not built-in. Supports OAuth 2.0 and OpenID Connect.

```typescript
import { genericOAuth } from 'better-auth/plugins'

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [{
        providerId: 'keycloak',
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
        discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
      }],
    }),
  ],
})
```

Client-side:

```typescript
await authClient.signIn.oauth2({ providerId: 'keycloak', callbackURL: '/dashboard' })
```

Pre-configured helpers available for Auth0, Keycloak, Okta, Microsoft Entra ID.

## OAuth 2.1 Provider

Your app as authorization server. Install: `@better-auth/oauth-provider` (separate package).

```typescript
import { betterAuth } from 'better-auth'
import { jwt } from 'better-auth/plugins'
import { oauthProvider } from '@better-auth/oauth-provider'

export const auth = betterAuth({
  disabledPaths: ['/token'],  // required: avoids conflict with /oauth2/token
  plugins: [
    jwt(),
    oauthProvider({
      loginPage: '/sign-in',
      consentPage: '/consent',
    }),
  ],
})
```

Endpoints exposed:

| Endpoint | Purpose |
|----------|---------|
| `/oauth2/authorize` | Authorization (code flow + PKCE) |
| `/oauth2/token` | Token exchange |
| `/oauth2/userinfo` | User info |
| `/oauth2/register` | Dynamic client registration (RFC 7591) |
| `/.well-known/openid-configuration` | OIDC discovery |
| `/jwks` | JSON Web Key Set |

Register a client (requires `allowDynamicClientRegistration: true` in provider config):

```typescript
const client = await authClient.oauth2.register({
  client_name: 'My Client',
  redirect_uris: ['https://client.example.com/callback'],
})
// Returns: { client_id, client_secret, client_name, redirect_uris }
```

## Dedicated Database

BetterAuth can use a separate DB. Manages its own tables (`user`, `session`, `account`, `verification`, plus OAuth plugin tables). Adapters: Prisma (`prismaAdapter`), Drizzle (`drizzleAdapter`), direct Kysely (PostgreSQL, MySQL, SQLite).

```typescript
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.AUTH_DATABASE_URL }),
})
```

Run migrations: `npx @better-auth/cli migrate`

## Gotchas

- **`oidcProvider` is deprecated.** The import `oidcProvider` from `better-auth/plugins` is legacy. Use `oauthProvider` from `@better-auth/oauth-provider`.
- **`disabledPaths: ['/token']` is required** when using OAuth Provider + JWT plugin. The JWT `/token` endpoint conflicts with `/oauth2/token`.
- **PKCE is mandatory** for OAuth 2.1 Provider. S256 only; `plain` is rejected.
- **Production readiness.** OAuth 2.1 Provider docs warn it "may not be suitable for production use." Evaluate stability for your use case.
- **No token refresh for generic OAuth.** Only built-in social providers support auto-refresh. Generic OAuth providers do not.
- **`@auth0/fga` is unrelated.** Do not confuse Auth0's FGA product with BetterAuth.
- **`disableSettingJwtHeader: true`** recommended when using OAuth Provider, so JWT does not set headers that conflict with OAuth's `/oauth2/userinfo` flow.
