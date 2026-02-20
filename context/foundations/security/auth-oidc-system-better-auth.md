---
depends:
  - "@context/blocks/security/better-auth.md"
  - "@context/blocks/security/better-auth-oauth.md"
  - "@context/blocks/construct/react.md"
  - "@context/foundations/security/auth-session-better-auth.md"
  - "@context/foundations/security/auth-routes-react.md"
tags: [auth]
---

# BetterAuth OIDC Provider System

Complete map of how BetterAuth OIDC fits together across three services and two databases. Adapt the placeholder names, ports, and env values to your project.

## References

@context/blocks/security/better-auth.md
@context/blocks/security/better-auth-oauth.md
@context/blocks/construct/react.md
@context/foundations/security/auth-session-better-auth.md
@context/foundations/security/auth-routes-react.md

---

## Service Map

| Service | Role |
|---|---|
| Auth Server | BetterAuth OIDC provider -- issues tokens, manages sessions |
| Frontend SPA | React frontend -- OAuth 2.1 PKCE client |
| API Server | Backend -- validates JWTs via JWKS |

| Database | Managed By | Purpose |
|---|---|---|
| Auth DB | BetterAuth (auto-migrations) | Auth users, sessions, OAuth clients, JWKS key pairs |
| App DB | Prisma | App data -- `User.authUserId` links to BetterAuth user |

---

## Auth Server Setup

BetterAuth is initialized with three plugins: `jwt()`, `oauthProvider()`, and email+password. It connects via a direct `pg.Pool` -- NOT Prisma.

```typescript
const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: config.oidcProvider.issuerUrl,
  database: authDatabasePool,
  disabledPaths: ["/token"],
  emailAndPassword: { enabled: true },
  plugins: [
    jwt({
      disableSettingJwtHeader: true,
      jwks: { keyPairConfig: { alg: "RS256" } },
      jwt: { issuer: config.oidcProvider.jwt.issuer },
    }),
    oauthProvider({
      cachedTrustedClients: new Set([config.trustedClientId]),
      consentPage: "/consent",
      loginPage: "/login",
    }),
  ],
  secret: config.BETTER_AUTH_SECRET,
});
```

The auth instance is wrapped in a Hono HTTP server exposing:

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/.well-known/openid-configuration` | GET | OIDC discovery document |
| `/jwks` | GET | RS256 public keys (proxied from `/api/auth/jwks`) |
| `/oauth2/end-session` | GET | Custom logout handler (see Gotchas) |
| `/login` | GET | Inline HTML login form |
| `/api/auth/*` | ALL | All BetterAuth handler routes |

On startup the server runs two setup steps before accepting traffic:

```typescript
// BetterAuth does NOT auto-migrate when using pg.Pool directly.
// Both steps are idempotent and safe on every cold start.
const { toBeCreated } = await getMigrations(auth.options);
await runMigrations(toBeCreated, authDatabasePool);
await ensureTrustedClientRegistered();
```

---

## Client-Side OAuth Flow (Frontend SPA)

The frontend SPA implements OAuth 2.1 PKCE **by hand**. It does NOT use BetterAuth's built-in client login methods for the OAuth flow. `createAuthClient` from `better-auth/client` is used only for `authClient.getSession()`.

```typescript
function startOAuthLogin() {
  const verifier = generateCodeVerifier();
  const challenge = generateS256Challenge(verifier);

  localStorage.setItem(
    "auth.oauth.login-transaction",
    JSON.stringify({ state, verifier }),
  );

  window.location.href = buildAuthorizeUrl({
    response_type: "code",
    client_id: AUTH_CLIENT_ID,
    redirect_uri: AUTH_REDIRECT_URI,
    scope: AUTH_SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
}

function completeOAuthCallback(callbackParams: URLSearchParams) {
  const transaction = JSON.parse(
    localStorage.getItem("auth.oauth.login-transaction")!,
  );

  const tokens = await exchangeCodeForTokens({
    code: callbackParams.get("code"),
    code_verifier: transaction.verifier,
    redirect_uri: AUTH_REDIRECT_URI,
  });

  // Required for logout -- end-session endpoint needs id_token_hint
  localStorage.setItem("auth.oauth.id-token", tokens.id_token);
}

function startOAuthLogout() {
  const idToken = localStorage.getItem("auth.oauth.id-token");
  localStorage.clear();
  window.location.href =
    `/oauth2/end-session?id_token_hint=${idToken}&post_logout_redirect_uri=...`;
}
```

Frontend environment variables (Vite):

```
VITE_AUTH_ISSUER_URL=http://localhost:<auth-port>
VITE_AUTH_CLIENT_ID=my-app-client
VITE_AUTH_REDIRECT_URI=http://localhost:<frontend-port>/auth/callback
VITE_AUTH_SCOPES=openid profile email
```

---

## API JWT Protection

The API validates JWTs using `jose` -- completely independent of BetterAuth. The JWKS set is cached at module level.

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL!));

async function verifyAccessToken(authHeader: string | null): Promise<JWTClaims> {
  const token = extractBearerToken(authHeader);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: process.env.AUTH_ISSUER,
    audience: process.env.AUTH_AUDIENCE,
  });
  return payload;
}
```

Bypass logic for E2E tests or public routes belongs in middleware/route config, not inside the verification function itself (see coding style: separate concerns, no boolean flags switching code paths).

API environment variables:

```
AUTH_AUDIENCE=my-app-client
AUTH_ISSUER=http://localhost:<auth-port>
AUTH_JWKS_URL=http://localhost:<auth-port>/jwks
```

---

## Database Linking

The Prisma `User` model links to BetterAuth via `authUserId`:

```prisma
model User {
  authUserId String? @unique
  // ... app fields
}
```

The seed script creates records in both databases in order:

```typescript
// Auth DB must be seeded first -- the app DB record references the auth user ID
const { data } = await auth.api.signUpEmail({ email, password, name });

await prisma.user.create({
  data: { authUserId: data.user.id, email },
});
```

---

## Auth Server Environment Variables

| Variable | Purpose |
|---|---|
| `AUTH_DATABASE_URL` | PostgreSQL connection to the auth database |
| `BETTER_AUTH_SECRET` | BetterAuth signing secret |
| `AUTH_ISSUER_URL` | Auth server's public URL |
| `AUTH_PORT` | Port the auth server listens on |
| `AUTH_OIDC_JWT_SIGNING_ALG` | Must be `RS256` |
| `AUTH_TRUSTED_CLIENT_ID` | OAuth client ID (e.g., `my-app-client`) |
| `AUTH_TRUSTED_CLIENT_REDIRECT_URI` | Callback URL (e.g., `http://localhost:<frontend-port>/auth/callback`) |
| `AUTH_TRUSTED_CLIENT_POST_LOGOUT_REDIRECT_URI` | Post-logout URL (e.g., `http://localhost:<frontend-port>/login`) |
| `AUTH_TRUSTED_CLIENT_SKIP_CONSENT` | Skip consent page for trusted client |
| `AUTH_TRUSTED_CLIENT_PKCE_REQUIRED` | Must be `true` |
| `AUTH_TRUSTED_CLIENT_PKCE_CHALLENGE_METHOD` | Must be `S256` |
| `AUTH_SEED_DEV_EMAIL` | Dev seed user email |
| `AUTH_SEED_DEV_NAME` | Dev seed user display name |
| `AUTH_SEED_DEV_PASSWORD` | Dev seed user password |

---

## Complete Request Flow

A user's journey from cold start to authenticated API call:

- **User visits** the frontend -- `AuthSessionProvider` calls `authClient.getSession()` -- no session found -- login page renders.
- **Login click** -- `startOAuthLogin()` generates PKCE verifier + S256 challenge, stores transaction in localStorage, redirects to the auth server's `/api/auth/oauth2/authorize` with `response_type=code`, `client_id`, `code_challenge`, `code_challenge_method=S256`, and `state`.
- **Auth server** checks session cookie -- no cookie -- redirects to `/login` (inline HTML form served by Hono).
- **User submits credentials** -- browser POSTs to `/api/auth/sign-in/email` -- BetterAuth validates, sets session cookie -- redirects back through authorize -- issues auth code -- redirects to the frontend's `/auth/callback?code=...&state=...`.
- **Callback page mounts** -- `completeOAuthCallback()` validates state against localStorage transaction, exchanges code for tokens at `/api/auth/oauth2/token` using PKCE verifier, stores `id_token` in localStorage.
- **Session established** -- `authClient.getSession()` returns session -- the protected UI renders.
- **API calls** -- frontend attaches Bearer token to requests -- API calls `verifyAccessToken()` -- `jose` verifies JWT signature against cached JWKS, checks issuer and audience -- returns claims -- handler executes.
- **Logout** -- `startOAuthLogout()` reads `id_token` from localStorage, clears localStorage, redirects to `/oauth2/end-session?id_token_hint=...` -- custom Hono handler constructs internal POST to `/api/auth/sign-out`, forwards `Set-Cookie` clear headers, redirects to the post-logout URI.

---

## Gotchas

- **BetterAuth tables not auto-created** -- When using a direct `pg.Pool`, BetterAuth does NOT run migrations automatically. You MUST call `getMigrations(auth.options)` and apply the results on startup. Skipping this causes silent failures on first request.

- **Trusted OAuth client not auto-registered** -- BetterAuth has no mechanism to seed OAuth clients at startup. `ensureTrustedClientRegistered()` uses raw SQL to `INSERT INTO oauthClient ... ON CONFLICT DO NOTHING`. Without this, the authorize endpoint returns client-not-found on every cold start.

- **`disabledPaths: ["/token"]` is mandatory** -- The JWT plugin registers a `/token` endpoint that silently conflicts with the OAuth Provider's `/oauth2/token`. Token exchange breaks without this config key.

- **`disableSettingJwtHeader: true` needed** -- The JWT plugin otherwise sets response headers that interfere with the OAuth provider's own header handling. Both plugins must be present; only the header behavior must be suppressed.

- **No built-in login UI** -- BetterAuth handles auth logic but provides no HTML form. The auth server renders an inline HTML login form directly in a Hono route handler.

- **Custom `/oauth2/end-session` required** -- BetterAuth's sign-out requires `POST` + JSON body + matching `Origin` header. Browsers cannot construct this from a redirect. The custom GET handler internally builds the POST, forwards `Set-Cookie` clear headers from BetterAuth's response, and then issues the redirect to the post-logout URI.

- **`id_token` must be stored for logout** -- The end-session endpoint requires an `id_token_hint`. `completeOAuthCallback()` stores the raw `id_token` in localStorage immediately after token exchange. Logout will fail if this step is skipped.

- **CORS middleware required on auth server** -- The frontend SPA makes cross-origin fetch requests to the auth server for the token exchange step. Hono's `cors()` middleware must be mounted before BetterAuth routes.

- **Docker env vars** -- When containerizing, all auth-server env vars listed above must appear in your Docker Compose configuration. Missing vars fail silently at runtime, not at startup.

- **`pnpm.onlyBuiltDependencies`** -- Required in `package.json` for pnpm 10+ during Docker builds. Without it, native dependency builds are skipped and the image may fail to start.
