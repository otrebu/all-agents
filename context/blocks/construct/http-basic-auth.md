---
depends: []
---

# HTTP Basic Authentication

Standard HTTP authentication scheme using Base64-encoded credentials.

## Setup

Built into Node.js - no external dependencies required.

## Authorization Header Format

```
Authorization: Basic <base64(username:password)>
```

Example: `Authorization: Basic dXNlcjpwYXNz` (user:pass)

## Parsing Credentials

```typescript
function parseBasicAuth(authHeader: string | undefined): { username: string; password: string } | null {
  if (!authHeader?.startsWith("Basic ")) {
    return null;
  }

  const base64Credentials = authHeader.slice(6); // Remove "Basic " prefix
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  const [username, password] = credentials.split(":");

  if (!username || password === undefined) {
    return null;
  }

  return { username, password };
}
```

## Creating Credentials

```typescript
function createBasicAuthHeader(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const base64Credentials = Buffer.from(credentials, "utf8").toString("base64");
  return `Basic ${base64Credentials}`;
}

// Usage
const authHeader = createBasicAuthHeader("user", "pass");
// Result: "Basic dXNlcjpwYXNz"
```

## WWW-Authenticate Challenge

When authentication fails, return 401 with `WWW-Authenticate` header:

```typescript
function sendAuthChallenge(reply: FastifyReply, realm: string = "Protected Area") {
  reply
    .code(401)
    .header("WWW-Authenticate", `Basic realm="${realm}"`)
    .send({ error: "Authentication required" });
}
```

Browser displays login dialog when it receives this response.

## Fastify preHandler Hook

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";

async function basicAuthHook(request: FastifyRequest, reply: FastifyReply) {
  const credentials = parseBasicAuth(request.headers.authorization);

  if (!credentials) {
    return sendAuthChallenge(reply);
  }

  const isValid = await validateCredentials(credentials.username, credentials.password);

  if (!isValid) {
    return sendAuthChallenge(reply);
  }

  // Store user on request for downstream handlers
  request.user = { username: credentials.username };
}

// Apply to all routes
server.addHook("preHandler", basicAuthHook);

// Apply to specific routes
server.get("/admin", { preHandler: basicAuthHook }, async function (request) {
  return { user: request.user.username };
});
```

## Security Considerations

**HTTPS is mandatory.** Basic auth sends credentials in every request. Base64 is encoding, not encryption. Without HTTPS, credentials are transmitted in plaintext.

**Timing attacks.** Use constant-time comparison for password validation:

```typescript
import { timingSafeEqual } from "node:crypto";

function isPasswordValid(providedPassword: string, expectedPassword: string): boolean {
  if (providedPassword.length !== expectedPassword.length) {
    return false;
  }

  const providedBuffer = Buffer.from(providedPassword, "utf8");
  const expectedBuffer = Buffer.from(expectedPassword, "utf8");

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
```

**Rate limiting.** Add rate limiting to auth endpoints to prevent brute force attacks.

## When to Use

**Good for:**

- Internal tools and dashboards
- Development/staging environments
- Service-to-service authentication
- Simple admin panels
- Temporary access control

**Not for:**

- User-facing production authentication (use OAuth2, JWT, session-based auth)
- Mobile apps (credentials stored on device)
- APIs with multiple auth methods (use Bearer tokens)
- Fine-grained permissions (use role-based auth)
