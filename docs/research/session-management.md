# Session Management: Comprehensive Security Reference

A complete guide to session management, covering cookies, tokens, and security best practices. This document serves as a reference for implementing secure authentication and session handling in web applications.

---

## Table of Contents

1. [Session vs JWT Tokens](#session-vs-jwt-tokens)
2. [Cookie Security Attributes](#cookie-security-attributes)
3. [Token Storage: Cookies vs localStorage](#token-storage-cookies-vs-localstorage)
4. [Refresh Token Rotation](#refresh-token-rotation)
5. [Session Expiration Strategies](#session-expiration-strategies)
6. [Remember Me Functionality](#remember-me-functionality)
7. [Concurrent Session Handling](#concurrent-session-handling)
8. [Session Invalidation](#session-invalidation)
9. [CSRF Protection](#csrf-protection)
10. [XSS Prevention](#xss-prevention)
11. [JWT Security Best Practices](#jwt-security-best-practices)
12. [Backend for Frontend (BFF) Pattern](#backend-for-frontend-bff-pattern)
13. [Session Fingerprinting](#session-fingerprinting)
14. [Security Checklist](#security-checklist)

---

## Session vs JWT Tokens

### Session-Based Authentication (Stateful)

Session-based authentication stores user state on the server. The server creates a session record and provides the client with a session identifier (typically stored in a cookie).

**How It Works:**

```
1. User logs in with credentials
2. Server creates session record in database/memory
3. Server sends session ID to client (via cookie)
4. Client sends session ID with each request
5. Server looks up session data for each request
```

**Advantages:**

- Immediate session invalidation (delete from server)
- Complete control over session state
- Smaller payload (only session ID transmitted)
- No token expiration complexity
- Better for sensitive data (not exposed to client)

**Disadvantages:**

- Server must store session data (memory/database)
- Scaling requires session synchronization (sticky sessions or shared store)
- Database lookup on every request

### JWT Authentication (Stateless)

JWT (JSON Web Token) authentication encodes user claims in a signed token. The server does not need to store session state.

**How It Works:**

```
1. User logs in with credentials
2. Server creates JWT with user claims, signs it
3. Server sends JWT to client
4. Client stores JWT (memory, localStorage, or cookie)
5. Client sends JWT with each request (Authorization header or cookie)
6. Server validates signature and claims locally
```

**JWT Structure:**

```
Header.Payload.Signature

Header:  { "alg": "RS256", "typ": "JWT" }
Payload: { "sub": "user123", "exp": 1735034400, "iat": 1735030800, "iss": "myapp" }
Signature: RSASHA256(base64(header) + "." + base64(payload), privateKey)
```

**Advantages:**

- Stateless - no server-side storage needed
- Excellent for microservices/distributed systems
- Self-contained - carries user claims
- No database lookup for validation
- Works well with Single Sign-On (SSO)

**Disadvantages:**

- Cannot be invalidated before expiration (without blocklist)
- Larger payload size
- Token contents visible to client (unless encrypted)
- Complexity in handling refresh tokens

### When to Use Each

| Scenario | Recommendation |
|----------|----------------|
| Monolithic application | Session-based |
| Microservices/distributed | JWT |
| Need immediate logout | Session-based |
| Cross-domain authentication | JWT |
| SSO/OAuth integration | JWT |
| High-security (banking) | Session-based or hybrid |
| Mobile APIs | JWT |

### Hybrid Approach (Recommended for Modern Apps)

Combine the benefits of both:

```typescript
// Short-lived JWT for API authentication (5-15 minutes)
const accessToken = jwt.sign(
  { sub: userId, role: 'user' },
  privateKey,
  { algorithm: 'RS256', expiresIn: '15m' }
);

// Long-lived refresh token stored server-side with session
const refreshToken = generateSecureToken();
await saveRefreshToken(userId, refreshToken, { expiresAt: addDays(14) });

// Store refresh token in HttpOnly cookie
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
});
```

This provides:
- Fast JWT validation for most requests
- Immediate revocation via refresh token invalidation
- Short window of vulnerability if access token is compromised

---

## Cookie Security Attributes

Cookies are the primary mechanism for session management. Proper configuration is critical for security.

### Essential Attributes

#### HttpOnly

Prevents JavaScript access to the cookie, mitigating XSS-based session theft.

```javascript
// Express.js
res.cookie('sessionId', token, {
  httpOnly: true  // document.cookie cannot access this
});
```

**When to Use:** Always for session/authentication cookies.

#### Secure

Ensures cookies are only sent over HTTPS connections.

```javascript
res.cookie('sessionId', token, {
  secure: true  // Only sent over HTTPS
});
```

**When to Use:** Always in production. May disable in development for localhost.

```javascript
res.cookie('sessionId', token, {
  secure: process.env.NODE_ENV === 'production'
});
```

#### SameSite

Controls when cookies are sent with cross-site requests.

| Value | Behavior | CSRF Protection |
|-------|----------|-----------------|
| `Strict` | Only same-site requests | Maximum |
| `Lax` | Same-site + top-level navigation GET | Balanced |
| `None` | All requests (requires Secure) | None |

```javascript
// Maximum security - recommended for session cookies
res.cookie('sessionId', token, {
  sameSite: 'strict'
});

// Balanced - allows following links from external sites
res.cookie('sessionId', token, {
  sameSite: 'lax'  // Default in modern browsers
});

// Cross-site required (OAuth, embedded widgets)
res.cookie('sessionId', token, {
  sameSite: 'none',
  secure: true  // Required when sameSite is 'none'
});
```

### Additional Attributes

#### Domain

Restricts which domains can receive the cookie.

```javascript
// Only sent to exact domain
res.cookie('sessionId', token, {
  domain: 'app.example.com'
});

// Sent to domain and all subdomains (avoid for sessions)
res.cookie('sessionId', token, {
  domain: '.example.com'
});
```

**Best Practice:** Be as restrictive as possible. Avoid setting domain to include subdomains unless necessary.

#### Path

Restricts which paths can receive the cookie.

```javascript
res.cookie('sessionId', token, {
  path: '/api'  // Only sent for /api/* requests
});
```

#### Max-Age / Expires

Controls cookie lifetime.

```javascript
// Session cookie - deleted when browser closes
res.cookie('sessionId', token);  // No maxAge or expires

// Persistent cookie - survives browser restart
res.cookie('sessionId', token, {
  maxAge: 24 * 60 * 60 * 1000  // 24 hours in milliseconds
});

// Using expires (specific date)
res.cookie('sessionId', token, {
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
});
```

### Complete Secure Cookie Configuration

```javascript
// Express.js - Secure session cookie
res.cookie('sessionId', sessionToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,  // 15 minutes
  path: '/',
  domain: 'app.example.com'
});

// Node.js with Set-Cookie header
const cookieValue = [
  `sessionId=${sessionToken}`,
  'HttpOnly',
  'Secure',
  'SameSite=Strict',
  'Max-Age=900',
  'Path=/',
  'Domain=app.example.com'
].join('; ');

res.setHeader('Set-Cookie', cookieValue);
```

### Cookie Prefixes (Additional Protection)

Modern browsers support cookie prefixes for extra security:

```javascript
// __Secure- prefix: Must have Secure attribute
res.cookie('__Secure-sessionId', token, {
  secure: true,
  httpOnly: true
});

// __Host- prefix: Most restrictive
// - Must have Secure attribute
// - Must not have Domain attribute
// - Path must be "/"
res.cookie('__Host-sessionId', token, {
  secure: true,
  httpOnly: true,
  path: '/'
});
```

---

## Token Storage: Cookies vs localStorage

### Comparison Matrix

| Aspect | localStorage | Cookies (HttpOnly) | In-Memory |
|--------|--------------|-------------------|-----------|
| XSS Protection | Vulnerable | Protected | Protected |
| CSRF Protection | Immune | Needs mitigation | Protected |
| Persists across tabs | Yes | Yes | No |
| Persists page refresh | Yes | Yes | No |
| Automatic with requests | No | Yes | No |
| Size limit | ~5-10MB | ~4KB | N/A |
| Accessible by JS | Yes | No (HttpOnly) | Yes |

### localStorage

**Advantages:**
- Not sent automatically (immune to CSRF)
- Easy to use with APIs requiring Authorization header
- More storage capacity

**Disadvantages:**
- Fully accessible to JavaScript (XSS vulnerable)
- Attacker can exfiltrate tokens remotely
- No built-in expiration

```javascript
// Storing token - VULNERABLE TO XSS
localStorage.setItem('accessToken', token);

// Usage with fetch
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

**When to Use:** Generally discouraged for sensitive tokens. May be acceptable for non-sensitive data.

### HttpOnly Cookies

**Advantages:**
- Not accessible to JavaScript (XSS protected)
- Automatic transmission with requests
- Built-in expiration support
- Security attributes available

**Disadvantages:**
- Vulnerable to CSRF (mitigated with SameSite + tokens)
- Limited size (~4KB)
- Harder to use with Authorization header pattern

```javascript
// Server sets cookie
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// Client requests automatically include cookie
fetch('/api/data', {
  credentials: 'include'  // Include cookies
});
```

### In-Memory Storage

**Advantages:**
- Not persisted anywhere
- Protected from both XSS (storage) and CSRF
- Most secure for access tokens

**Disadvantages:**
- Lost on page refresh/navigation
- Not shared across tabs
- Requires refresh token flow

```javascript
// Store in module-scoped variable
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Refresh on page load using refresh token cookie
async function initAuth() {
  const response = await fetch('/api/auth/refresh', {
    credentials: 'include'
  });
  if (response.ok) {
    const { accessToken } = await response.json();
    setAccessToken(accessToken);
  }
}
```

### Recommended Pattern: Hybrid Storage

Store access tokens in memory, refresh tokens in HttpOnly cookies:

```javascript
// Frontend
class AuthManager {
  private accessToken: string | null = null;

  async initialize() {
    await this.refresh();
  }

  async refresh(): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const { accessToken } = await res.json();
        this.accessToken = accessToken;
        this.scheduleRefresh();
        return true;
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
    this.accessToken = null;
    return false;
  }

  private scheduleRefresh() {
    // Refresh before expiration (e.g., 1 minute before)
    setTimeout(() => this.refresh(), 14 * 60 * 1000);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Backend
app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken || !validateRefreshToken(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const { userId } = getRefreshTokenData(refreshToken);
  const accessToken = generateAccessToken(userId);

  res.json({ accessToken });
});
```

---

## Refresh Token Rotation

Refresh token rotation issues a new refresh token with each use, invalidating the previous one. This limits the damage from token theft.

### Why Rotation Matters

Without rotation:
- Stolen refresh token provides long-term access
- No way to detect theft
- Attacker can use token indefinitely

With rotation:
- Each token is single-use
- Theft is detectable (reuse attempt)
- Automatic invalidation of stolen tokens

### Implementation

```typescript
// Database schema for refresh tokens
interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;  // Groups related tokens
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

// Token refresh with rotation
async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  const tokenHash = hashToken(refreshToken);
  const storedToken = await db.refreshTokens.findOne({ tokenHash });

  if (!storedToken) {
    return null;  // Token not found
  }

  if (storedToken.isRevoked) {
    // SECURITY: Potential token theft detected!
    // Revoke entire token family
    await db.refreshTokens.updateMany(
      { familyId: storedToken.familyId },
      { isRevoked: true }
    );
    await notifySecurityTeam(storedToken.userId, 'Token reuse detected');
    return null;
  }

  if (storedToken.expiresAt < new Date()) {
    return null;  // Token expired
  }

  // Revoke current token
  await db.refreshTokens.update(
    { id: storedToken.id },
    { isRevoked: true }
  );

  // Generate new token pair
  const newRefreshToken = generateSecureToken();
  const newAccessToken = generateAccessToken(storedToken.userId);

  // Store new refresh token (same family)
  await db.refreshTokens.create({
    id: generateId(),
    userId: storedToken.userId,
    tokenHash: hashToken(newRefreshToken),
    familyId: storedToken.familyId,
    isRevoked: false,
    expiresAt: addDays(new Date(), 14),
    createdAt: new Date()
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// Login creates new token family
async function login(userId: string): Promise<TokenPair> {
  const familyId = generateId();
  const refreshToken = generateSecureToken();
  const accessToken = generateAccessToken(userId);

  await db.refreshTokens.create({
    id: generateId(),
    userId,
    tokenHash: hashToken(refreshToken),
    familyId,
    isRevoked: false,
    expiresAt: addDays(new Date(), 14),
    createdAt: new Date()
  });

  return { accessToken, refreshToken };
}
```

### Token Family Invalidation

When reuse is detected, invalidate the entire token family:

```typescript
// Reuse detection flow
async function handleTokenReuse(token: RefreshToken) {
  // 1. Revoke all tokens in family
  await db.refreshTokens.updateMany(
    { familyId: token.familyId },
    { isRevoked: true }
  );

  // 2. Log security event
  await logSecurityEvent({
    type: 'REFRESH_TOKEN_REUSE',
    userId: token.userId,
    familyId: token.familyId,
    timestamp: new Date(),
    severity: 'HIGH'
  });

  // 3. Optionally notify user
  await sendSecurityAlert(token.userId, {
    subject: 'Suspicious Activity Detected',
    message: 'Your session was terminated due to suspicious activity.'
  });

  // 4. Consider requiring re-authentication
  await invalidateAllUserSessions(token.userId);
}
```

### Recommended Token Lifetimes

| Token Type | Lifetime | Notes |
|------------|----------|-------|
| Access Token | 5-15 minutes | Short to limit exposure |
| Refresh Token | 7-14 days | Balance security/UX |
| Absolute Session | 24-72 hours | Force re-auth periodically |

---

## Session Expiration Strategies

### Idle Timeout (Sliding Expiration)

Session expires after a period of inactivity. Each request resets the timer.

```typescript
// Express middleware for sliding session
function slidingSession(idleMinutes: number) {
  return (req, res, next) => {
    if (req.session) {
      const now = Date.now();
      const lastActivity = req.session.lastActivity || now;
      const idleTime = now - lastActivity;

      if (idleTime > idleMinutes * 60 * 1000) {
        // Session expired due to inactivity
        req.session.destroy();
        return res.status(401).json({ error: 'Session expired' });
      }

      // Update last activity
      req.session.lastActivity = now;
    }
    next();
  };
}

app.use(slidingSession(15));  // 15-minute idle timeout
```

**Use Cases:**
- Interactive web applications
- Banking/financial apps (short timeout)
- E-commerce shopping carts

### Absolute Timeout

Session expires after a fixed time regardless of activity.

```typescript
function absoluteSession(maxMinutes: number) {
  return (req, res, next) => {
    if (req.session) {
      const now = Date.now();
      const createdAt = req.session.createdAt;

      if (!createdAt) {
        req.session.createdAt = now;
      } else if (now - createdAt > maxMinutes * 60 * 1000) {
        // Session expired (absolute timeout)
        req.session.destroy();
        return res.status(401).json({ error: 'Session expired' });
      }
    }
    next();
  };
}

app.use(absoluteSession(480));  // 8-hour maximum session
```

**Use Cases:**
- High-security applications
- Compliance requirements (PCI DSS, HIPAA)
- Workday-based access

### Combined Approach (Recommended)

Apply both idle and absolute timeouts:

```typescript
interface SessionConfig {
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
  renewalThresholdMinutes: number;
}

function configuredSession(config: SessionConfig) {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return next();
    }

    const now = Date.now();
    const { createdAt, lastActivity } = req.session;

    // Check absolute timeout
    if (now - createdAt > config.absoluteTimeoutMinutes * 60 * 1000) {
      req.session.destroy();
      return res.status(401).json({
        error: 'Session expired',
        reason: 'absolute_timeout'
      });
    }

    // Check idle timeout
    if (now - lastActivity > config.idleTimeoutMinutes * 60 * 1000) {
      req.session.destroy();
      return res.status(401).json({
        error: 'Session expired',
        reason: 'idle_timeout'
      });
    }

    // Update last activity
    req.session.lastActivity = now;

    // Regenerate session ID periodically
    if (now - lastActivity > config.renewalThresholdMinutes * 60 * 1000) {
      req.session.regenerate((err) => {
        if (err) console.error('Session regeneration failed:', err);
      });
    }

    next();
  };
}

app.use(configuredSession({
  idleTimeoutMinutes: 15,
  absoluteTimeoutMinutes: 480,
  renewalThresholdMinutes: 30
}));
```

### Compliance Requirements

| Standard | Idle Timeout | Notes |
|----------|--------------|-------|
| PCI DSS | 15 minutes | Payment card environments |
| HIPAA | 15-30 minutes | Healthcare data |
| NIST SP 800-63B | 1 hour (high) / 12 hours (moderate) | Government |
| SOX | Based on risk | Financial reporting |

---

## Remember Me Functionality

"Remember Me" extends session persistence beyond browser closure. Security must be carefully considered.

### Secure Implementation

```typescript
// Generate remember me token (separate from session)
interface RememberMeToken {
  id: string;
  userId: string;
  series: string;      // Identifies the login "series"
  tokenHash: string;   // Hashed token for comparison
  expiresAt: Date;
  lastUsed: Date;
  userAgent: string;
  ipAddress: string;
}

async function createRememberMeToken(
  userId: string,
  req: Request
): Promise<string> {
  const series = crypto.randomBytes(32).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');

  await db.rememberMeTokens.create({
    id: generateId(),
    userId,
    series,
    tokenHash: hashToken(token),
    expiresAt: addDays(new Date(), 30),
    lastUsed: new Date(),
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });

  // Return combined token: series.token
  return `${series}.${token}`;
}

async function validateRememberMe(
  combinedToken: string,
  req: Request
): Promise<{ userId: string; newToken: string } | null> {
  const [series, token] = combinedToken.split('.');

  if (!series || !token) {
    return null;
  }

  const storedToken = await db.rememberMeTokens.findOne({ series });

  if (!storedToken) {
    return null;
  }

  if (storedToken.expiresAt < new Date()) {
    await db.rememberMeTokens.delete({ series });
    return null;
  }

  // Verify token hash
  if (!verifyTokenHash(token, storedToken.tokenHash)) {
    // Potential theft: token doesn't match but series exists
    // Delete all tokens for this user
    await db.rememberMeTokens.deleteMany({ userId: storedToken.userId });
    await logSecurityEvent({
      type: 'REMEMBER_ME_THEFT_SUSPECTED',
      userId: storedToken.userId,
      series
    });
    return null;
  }

  // Rotate token (new token, same series)
  const newToken = crypto.randomBytes(32).toString('hex');

  await db.rememberMeTokens.update(
    { series },
    {
      tokenHash: hashToken(newToken),
      lastUsed: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    }
  );

  return {
    userId: storedToken.userId,
    newToken: `${series}.${newToken}`
  };
}
```

### Cookie Configuration for Remember Me

```typescript
function setRememberMeCookie(res: Response, token: string) {
  res.cookie('remember_me', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
    path: '/'
  });
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
  req.session.userId = user.id;
  req.session.createdAt = Date.now();

  if (rememberMe) {
    const token = await createRememberMeToken(user.id, req);
    setRememberMeCookie(res, token);
  }

  res.json({ success: true });
});
```

### Security Considerations

1. **Re-authenticate for sensitive operations:** Even with "remember me," require password for:
   - Password changes
   - Email changes
   - Payment operations
   - Security settings

2. **Display active sessions:** Allow users to view and revoke remember me sessions.

3. **Invalidate on password change:** Delete all remember me tokens when password changes.

```typescript
async function changePassword(userId: string, newPassword: string) {
  await updatePassword(userId, newPassword);

  // Invalidate all remember me tokens
  await db.rememberMeTokens.deleteMany({ userId });

  // Optionally invalidate all sessions
  await db.sessions.deleteMany({ userId });
}
```

---

## Concurrent Session Handling

Managing multiple simultaneous sessions for the same user account.

### Strategies

#### 1. Allow Unlimited Sessions (Default)

Simple but least secure. No restrictions on concurrent logins.

#### 2. Limit Session Count

Enforce a maximum number of concurrent sessions:

```typescript
const MAX_SESSIONS = 5;

async function createSession(userId: string): Promise<Session> {
  const existingSessions = await db.sessions.count({ userId });

  if (existingSessions >= MAX_SESSIONS) {
    // Option A: Reject new session
    throw new Error('Maximum sessions reached');

    // Option B: Remove oldest session
    const oldest = await db.sessions.findOne(
      { userId },
      { sort: { createdAt: 1 } }
    );
    await db.sessions.delete({ id: oldest.id });
  }

  return await db.sessions.create({
    id: generateId(),
    userId,
    createdAt: new Date(),
    lastActivity: new Date()
  });
}
```

#### 3. Single Session Only

New login terminates existing sessions:

```typescript
async function createSession(userId: string): Promise<Session> {
  // Terminate all existing sessions
  await db.sessions.deleteMany({ userId });

  // Notify user of other session terminations
  await sendNotification(userId, {
    type: 'SESSION_TERMINATED',
    message: 'You logged in from a new device'
  });

  return await db.sessions.create({
    id: generateId(),
    userId,
    createdAt: new Date()
  });
}
```

### Session Management UI

Provide users visibility and control:

```typescript
// Get all active sessions for user
app.get('/api/auth/sessions', async (req, res) => {
  const sessions = await db.sessions.find(
    { userId: req.session.userId },
    {
      select: ['id', 'createdAt', 'lastActivity', 'userAgent', 'ipAddress'],
      sort: { lastActivity: -1 }
    }
  );

  const sessionsWithMetadata = sessions.map(session => ({
    ...session,
    isCurrent: session.id === req.session.id,
    device: parseUserAgent(session.userAgent),
    location: geolocateIP(session.ipAddress)
  }));

  res.json(sessionsWithMetadata);
});

// Terminate specific session
app.delete('/api/auth/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  // Prevent terminating current session via this endpoint
  if (sessionId === req.session.id) {
    return res.status(400).json({ error: 'Use logout for current session' });
  }

  const result = await db.sessions.delete({
    id: sessionId,
    userId: req.session.userId  // Ensure user owns session
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ success: true });
});

// Terminate all other sessions
app.post('/api/auth/sessions/terminate-others', async (req, res) => {
  await db.sessions.deleteMany({
    userId: req.session.userId,
    id: { $ne: req.session.id }  // Exclude current session
  });

  res.json({ success: true });
});
```

### Anomaly Detection

Detect suspicious concurrent access:

```typescript
async function detectAnomalies(
  userId: string,
  newSession: SessionData
): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];
  const recentSessions = await db.sessions.find({
    userId,
    lastActivity: { $gt: subMinutes(new Date(), 5) }
  });

  for (const session of recentSessions) {
    // Check for impossible travel
    const distance = calculateDistance(
      geolocateIP(session.ipAddress),
      geolocateIP(newSession.ipAddress)
    );
    const timeDiff = differenceInMinutes(
      newSession.createdAt,
      session.lastActivity
    );
    const possibleSpeed = distance / (timeDiff / 60);  // km/h

    if (possibleSpeed > 1000) {  // Impossible speed
      alerts.push({
        type: 'IMPOSSIBLE_TRAVEL',
        severity: 'HIGH',
        details: { distance, timeDiff, possibleSpeed }
      });
    }

    // Check for different device/browser
    if (session.userAgent !== newSession.userAgent) {
      alerts.push({
        type: 'NEW_DEVICE',
        severity: 'MEDIUM',
        details: {
          previous: parseUserAgent(session.userAgent),
          new: parseUserAgent(newSession.userAgent)
        }
      });
    }
  }

  return alerts;
}
```

---

## Session Invalidation

Proper session termination is critical for security. Sessions must be invalidated server-side, not just client-side.

### Logout Implementation

```typescript
app.post('/api/auth/logout', async (req, res) => {
  // 1. Get session ID before destruction
  const sessionId = req.session?.id;
  const userId = req.session?.userId;

  // 2. Destroy server-side session
  if (req.session) {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 3. Clear session cookie
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });

  // 4. Clear remember me token if present
  if (req.cookies.remember_me) {
    const [series] = req.cookies.remember_me.split('.');
    await db.rememberMeTokens.delete({ series });
    res.clearCookie('remember_me', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/'
    });
  }

  // 5. Log the logout event
  await logSecurityEvent({
    type: 'LOGOUT',
    userId,
    sessionId,
    timestamp: new Date()
  });

  res.json({ success: true });
});
```

### Logout All Sessions

```typescript
app.post('/api/auth/logout-all', async (req, res) => {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Delete all sessions for user
  await db.sessions.deleteMany({ userId });

  // Delete all remember me tokens
  await db.rememberMeTokens.deleteMany({ userId });

  // Invalidate all refresh tokens
  await db.refreshTokens.updateMany(
    { userId },
    { isRevoked: true }
  );

  // Clear current session cookie
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });

  res.clearCookie('remember_me', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });

  res.json({ success: true });
});
```

### Automatic Invalidation Triggers

Invalidate sessions on security-sensitive events:

```typescript
// Password change
async function changePassword(userId: string, newPassword: string) {
  await updatePassword(userId, newPassword);
  await invalidateAllSessionsExceptCurrent(userId, currentSessionId);
}

// Email change
async function changeEmail(userId: string, newEmail: string) {
  await updateEmail(userId, newEmail);
  await invalidateAllSessions(userId);
  await sendEmailVerification(newEmail);
}

// Suspicious activity detected
async function handleSuspiciousActivity(userId: string) {
  await invalidateAllSessions(userId);
  await lockAccount(userId);
  await notifyUser(userId, 'Account security alert');
}

// Account recovery
async function completePasswordReset(userId: string, newPassword: string) {
  await updatePassword(userId, newPassword);
  await invalidateAllSessions(userId);
  await invalidateAllRefreshTokens(userId);
}
```

### JWT Invalidation (Blocklist)

For JWTs, maintain a blocklist for immediate invalidation:

```typescript
// Redis-based JWT blocklist
class JWTBlocklist {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    const ttl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blocklist:${jti}`, ttl, '1');
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    const result = await this.redis.get(`blocklist:${jti}`);
    return result !== null;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    // Store user's revocation timestamp
    await this.redis.set(
      `user_revoked:${userId}`,
      Date.now().toString()
    );
  }

  async isUserTokenRevoked(userId: string, issuedAt: number): Promise<boolean> {
    const revokedAt = await this.redis.get(`user_revoked:${userId}`);
    if (!revokedAt) return false;
    return issuedAt < parseInt(revokedAt, 10);
  }
}

// Middleware to check blocklist
async function validateJWT(req, res, next) {
  const token = extractToken(req);
  const decoded = jwt.verify(token, publicKey);

  // Check individual token revocation
  if (await blocklist.isRevoked(decoded.jti)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  // Check user-level revocation
  if (await blocklist.isUserTokenRevoked(decoded.sub, decoded.iat)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  req.user = decoded;
  next();
}
```

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) tricks authenticated users into making unintended requests.

### Synchronizer Token Pattern

Server generates a token, stores it in the session, and validates it on state-changing requests:

```typescript
// Generate CSRF token
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to set CSRF token
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  // Make token available to templates
  res.locals.csrfToken = req.session.csrfToken;

  // Also set as cookie for SPA access (not HttpOnly)
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    secure: true,
    sameSite: 'strict'
  });

  next();
});

// Validate CSRF on state-changing requests
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;

  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
});
```

### Double-Submit Cookie Pattern (Stateless)

For stateless applications, use signed double-submit cookies:

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET;

function createSignedCSRFToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  const data = `${timestamp}.${randomPart}`;

  const signature = createHmac('sha256', CSRF_SECRET)
    .update(`${sessionId}.${data}`)
    .digest('hex');

  return `${data}.${signature}`;
}

function verifySignedCSRFToken(
  token: string,
  sessionId: string,
  maxAgeMs: number = 3600000
): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [timestamp, randomPart, signature] = parts;
  const data = `${timestamp}.${randomPart}`;

  // Verify signature
  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(`${sessionId}.${data}`)
    .digest('hex');

  if (!timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return false;
  }

  // Check timestamp
  const tokenTime = parseInt(timestamp, 36);
  if (Date.now() - tokenTime > maxAgeMs) {
    return false;
  }

  return true;
}

// Middleware
app.use((req, res, next) => {
  const sessionId = req.cookies.sessionId;

  if (req.method === 'GET') {
    // Set double-submit cookie
    const token = createSignedCSRFToken(sessionId);
    res.cookie('XSRF-TOKEN', token, {
      secure: true,
      sameSite: 'strict'
      // NOT HttpOnly - JavaScript needs to read it
    });
  } else {
    // Validate on state-changing requests
    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    if (!verifySignedCSRFToken(headerToken, sessionId)) {
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
  }

  next();
});
```

### SameSite Cookies (Defense in Depth)

SameSite provides browser-level CSRF protection:

```typescript
// Combined approach: SameSite + CSRF tokens
res.cookie('sessionId', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',  // Allows top-level GET navigations
  // Use 'strict' for maximum protection
});
```

**SameSite Values:**
- `Strict`: Cookie never sent cross-site (may break legitimate flows)
- `Lax`: Cookie sent on top-level navigations (clicks from external sites)
- `None`: Cookie always sent (requires Secure; vulnerable to CSRF)

### Custom Request Headers

For APIs, require a custom header that browsers won't send cross-origin:

```typescript
// Backend validation
app.use('/api', (req, res, next) => {
  if (!req.headers['x-requested-with']) {
    return res.status(403).json({ error: 'Missing required header' });
  }
  next();
});

// Frontend
fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  body: JSON.stringify(data)
});
```

### Fetch Metadata Headers

Modern browsers send Sec-Fetch-* headers indicating request context:

```typescript
app.use((req, res, next) => {
  const site = req.headers['sec-fetch-site'];
  const mode = req.headers['sec-fetch-mode'];
  const dest = req.headers['sec-fetch-dest'];

  // Allow same-origin requests
  if (site === 'same-origin') {
    return next();
  }

  // Allow navigation requests (browser address bar)
  if (site === 'none') {
    return next();
  }

  // Block cross-site state-changing requests
  if (site === 'cross-site' && mode !== 'navigate') {
    return res.status(403).json({ error: 'Cross-site request blocked' });
  }

  next();
});
```

---

## XSS Prevention

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts, potentially stealing session tokens.

### Defense Layers

#### 1. Output Encoding

Encode data before inserting into HTML:

```typescript
// HTML context
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// JavaScript context (use JSON.stringify)
const userInput = '<script>alert("xss")</script>';
const safe = `<script>const data = ${JSON.stringify(userInput)};</script>`;

// URL context
const safeUrl = encodeURIComponent(userInput);
```

#### 2. Input Sanitization

Use established libraries for HTML sanitization:

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Sanitize user-provided HTML
function sanitizeHTML(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false
  });
}

// Usage
const userHTML = '<p onclick="alert(1)">Hello <script>evil()</script></p>';
const clean = sanitizeHTML(userHTML);
// Result: '<p>Hello </p>'
```

#### 3. Content Security Policy (CSP)

CSP is a critical second line of defense:

```typescript
// Strict CSP with nonces
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  res.setHeader('Content-Security-Policy', [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: https:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`
  ].join('; '));

  next();
});

// In HTML template
// <script nonce="<%= nonce %>">
//   // Inline script allowed because of nonce
// </script>
```

#### 4. HttpOnly Cookies

Prevent JavaScript access to session cookies:

```typescript
res.cookie('sessionId', token, {
  httpOnly: true  // document.cookie cannot access
});
```

### Modern Framework Protections

Modern frameworks provide built-in XSS protection:

```tsx
// React - automatically escapes by default
function Comment({ text }) {
  return <p>{text}</p>;  // Safe - text is escaped
}

// DANGER: Bypass escaping (avoid unless sanitized)
function RichComment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }} />;
}
```

```typescript
// Vue.js - automatically escapes by default
<template>
  <p>{{ userInput }}</p>  <!-- Safe - escaped -->
  <p v-html="sanitizedHTML"></p>  <!-- Danger - ensure sanitized -->
</template>
```

### Additional Headers

```typescript
// Security headers
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});
```

---

## JWT Security Best Practices

### Algorithm Selection

```typescript
// GOOD: Use RS256 (asymmetric) for distributed systems
const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '15m'
});

// Verification with public key
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256']  // Explicitly whitelist algorithms
});

// ACCEPTABLE: Use HS256 for single-server applications
const token = jwt.sign(payload, secretKey, {
  algorithm: 'HS256',
  expiresIn: '15m'
});

// BAD: Never use 'none' algorithm
// BAD: Don't let the token dictate the algorithm
```

### Claims Validation

Always validate these claims:

```typescript
interface JWTPayload {
  iss: string;  // Issuer
  sub: string;  // Subject (user ID)
  aud: string | string[];  // Audience
  exp: number;  // Expiration
  iat: number;  // Issued at
  nbf?: number; // Not before
  jti?: string; // JWT ID (for revocation)
}

function validateJWT(token: string): JWTPayload {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com',
    clockTolerance: 30  // Allow 30 seconds clock skew
  });

  // Additional custom validation
  if (!decoded.sub) {
    throw new Error('Missing subject claim');
  }

  return decoded as JWTPayload;
}
```

### Token Structure Best Practices

```typescript
// Access token payload
const accessTokenPayload = {
  iss: 'https://auth.example.com',
  sub: userId,
  aud: 'https://api.example.com',
  exp: Math.floor(Date.now() / 1000) + (15 * 60),  // 15 minutes
  iat: Math.floor(Date.now() / 1000),
  jti: crypto.randomUUID(),

  // Custom claims
  role: 'user',
  permissions: ['read:profile', 'write:profile'],

  // Token type (to differentiate access vs ID tokens)
  type: 'access'
};

// ID token payload (for OIDC)
const idTokenPayload = {
  iss: 'https://auth.example.com',
  sub: userId,
  aud: clientId,
  exp: Math.floor(Date.now() / 1000) + (60 * 60),
  iat: Math.floor(Date.now() / 1000),

  // User info
  email: user.email,
  email_verified: user.emailVerified,
  name: user.name,

  // Authentication info
  auth_time: authTime,
  nonce: nonce,  // For replay protection

  type: 'id'
};
```

### Key Management

```typescript
// Rotate keys regularly
// Store current and previous keys for seamless rotation

interface KeySet {
  current: { kid: string; privateKey: string; publicKey: string };
  previous: { kid: string; publicKey: string }[];
}

// Include key ID in JWT header
const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  keyid: keySet.current.kid,
  expiresIn: '15m'
});

// Verification looks up key by kid
function getPublicKey(kid: string): string {
  if (keySet.current.kid === kid) {
    return keySet.current.publicKey;
  }
  const previous = keySet.previous.find(k => k.kid === kid);
  if (previous) {
    return previous.publicKey;
  }
  throw new Error('Unknown key ID');
}

const decoded = jwt.verify(token, (header, callback) => {
  try {
    const key = getPublicKey(header.kid);
    callback(null, key);
  } catch (err) {
    callback(err);
  }
});
```

### Common Vulnerabilities to Avoid

```typescript
// 1. Algorithm confusion attack - ALWAYS specify allowed algorithms
jwt.verify(token, key, { algorithms: ['RS256'] });  // GOOD
jwt.verify(token, key);  // BAD - allows any algorithm

// 2. Key/secret confusion - Use appropriate key type
// For RS256: Use RSA public key (not secret string)
// For HS256: Use strong secret (not public key)

// 3. Missing expiration - ALWAYS set exp claim
jwt.sign(payload, key, { expiresIn: '15m' });  // GOOD

// 4. Sensitive data in payload - JWT is base64, not encrypted
// BAD: Including sensitive data
{ sub: userId, password: userPassword, ssn: userSSN }

// GOOD: Only include necessary claims
{ sub: userId, role: userRole }

// 5. Missing audience validation
jwt.verify(token, key, { audience: 'expected-audience' });  // GOOD
```

---

## Backend for Frontend (BFF) Pattern

The BFF pattern keeps tokens server-side, exposing only secure cookies to the browser.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Browser/SPA   │────▶│   BFF Server    │────▶│  API/Resource   │
│                 │     │                 │     │     Server      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
   Cookies only         Tokens stored here        Tokens attached
   (HttpOnly)           Session management        to requests
```

### Implementation

```typescript
// BFF Server (Express)
import express from 'express';
import session from 'express-session';
import axios from 'axios';

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  },
  store: new RedisStore({ client: redisClient })
}));

// Login endpoint - exchanges credentials for tokens
app.post('/bff/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Authenticate with identity provider
    const tokenResponse = await axios.post(
      'https://auth.example.com/oauth/token',
      {
        grant_type: 'password',
        username,
        password,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: 'openid profile'
      }
    );

    // Store tokens in session (server-side only)
    req.session.tokens = {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000)
    };

    // Return user info only (no tokens to browser)
    res.json({
      user: {
        id: tokenResponse.data.id_token.sub,
        name: tokenResponse.data.id_token.name
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Token refresh middleware
async function ensureValidToken(req, res, next) {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if token needs refresh (1 minute buffer)
  if (req.session.tokens.expiresAt < Date.now() + 60000) {
    try {
      const tokenResponse = await axios.post(
        'https://auth.example.com/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: req.session.tokens.refreshToken,
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
        }
      );

      req.session.tokens = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || req.session.tokens.refreshToken,
        expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000)
      };
    } catch (error) {
      // Refresh failed - session expired
      req.session.destroy();
      return res.status(401).json({ error: 'Session expired' });
    }
  }

  next();
}

// API proxy - attaches token to requests
app.use('/bff/api', ensureValidToken, async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `https://api.example.com${req.path}`,
      headers: {
        'Authorization': `Bearer ${req.session.tokens.accessToken}`,
        'Content-Type': req.headers['content-type']
      },
      data: req.body,
      params: req.query
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'API request failed' }
    );
  }
});

// Logout
app.post('/bff/auth/logout', async (req, res) => {
  if (req.session?.tokens?.refreshToken) {
    // Revoke tokens at IdP
    await axios.post('https://auth.example.com/oauth/revoke', {
      token: req.session.tokens.refreshToken,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET
    }).catch(() => {});  // Best effort
  }

  req.session.destroy();
  res.clearCookie('connect.sid');
  res.json({ success: true });
});
```

### Frontend Integration

```typescript
// SPA - no tokens exposed
class BFFClient {
  async login(username: string, password: string) {
    const response = await fetch('/bff/auth/login', {
      method: 'POST',
      credentials: 'include',  // Include cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }

  async fetchAPI(path: string, options: RequestInit = {}) {
    const response = await fetch(`/bff/api${path}`, {
      ...options,
      credentials: 'include'  // Cookies handle auth
    });

    if (response.status === 401) {
      // Handle session expiration
      window.location.href = '/login';
      return;
    }

    return response.json();
  }

  async logout() {
    await fetch('/bff/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    window.location.href = '/login';
  }
}
```

### Benefits

- **No tokens in browser:** Eliminates XSS token theft
- **Confidential client:** BFF can use client secrets
- **Simplified SPA:** No token management logic needed
- **Better security posture:** Follows current IETF recommendations

---

## Session Fingerprinting

Binding sessions to client characteristics helps detect session hijacking.

### Implementation

```typescript
interface SessionFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  // Optional: TLS fingerprint, screen resolution, etc.
}

function generateFingerprint(req: Request): string {
  const components = [
    req.ip,
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || ''
  ];

  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

// Store fingerprint on login
app.post('/api/auth/login', async (req, res) => {
  // ... authenticate user

  req.session.userId = user.id;
  req.session.fingerprint = generateFingerprint(req);
  req.session.createdAt = Date.now();

  res.json({ success: true });
});

// Validate fingerprint on requests
function validateFingerprint(strictness: 'strict' | 'relaxed' = 'relaxed') {
  return (req, res, next) => {
    if (!req.session?.fingerprint) {
      return next();
    }

    const currentFingerprint = generateFingerprint(req);

    if (strictness === 'strict') {
      if (currentFingerprint !== req.session.fingerprint) {
        // Fingerprint changed - potential hijacking
        req.session.destroy();
        return res.status(401).json({
          error: 'Session validation failed',
          code: 'FINGERPRINT_MISMATCH'
        });
      }
    } else {
      // Relaxed: only check IP change
      if (req.ip !== req.session.initialIP) {
        // Log for monitoring but don't block
        logSecurityEvent({
          type: 'IP_CHANGE',
          userId: req.session.userId,
          previousIP: req.session.initialIP,
          newIP: req.ip
        });
      }
    }

    next();
  };
}
```

### Considerations

- **IP changes:** Mobile users and VPN users frequently change IPs
- **User-Agent changes:** Browser updates change User-Agent
- **Proxy servers:** May modify headers
- **Balance:** Too strict = false positives; too relaxed = missed attacks

### Recommended Approach

```typescript
// Use fingerprinting for detection, not blocking
async function detectAnomalies(req: Request, session: Session) {
  const alerts: Alert[] = [];

  // Check IP country change
  const currentCountry = geolocate(req.ip).country;
  const sessionCountry = geolocate(session.initialIP).country;
  if (currentCountry !== sessionCountry) {
    alerts.push({ type: 'COUNTRY_CHANGE', severity: 'HIGH' });
  }

  // Check device change
  const currentDevice = parseUserAgent(req.headers['user-agent']);
  const sessionDevice = parseUserAgent(session.userAgent);
  if (currentDevice.browser !== sessionDevice.browser) {
    alerts.push({ type: 'BROWSER_CHANGE', severity: 'MEDIUM' });
  }

  // Take action based on alerts
  if (alerts.some(a => a.severity === 'HIGH')) {
    // Require re-authentication
    await requireReauth(session.userId);
  }

  return alerts;
}
```

---

## Security Checklist

### Session Management

- [ ] Use cryptographically secure random session IDs (128+ bits entropy)
- [ ] Regenerate session ID after authentication
- [ ] Regenerate session ID after privilege changes
- [ ] Implement idle timeout (15-30 minutes for most apps)
- [ ] Implement absolute timeout (8-24 hours)
- [ ] Invalidate session server-side on logout
- [ ] Store session data server-side, not in cookies

### Cookie Security

- [ ] Set `HttpOnly` on session cookies
- [ ] Set `Secure` on all cookies in production
- [ ] Set `SameSite=Strict` or `SameSite=Lax`
- [ ] Use `__Host-` prefix for sensitive cookies
- [ ] Set appropriate `Path` and `Domain`
- [ ] Use session cookies for authentication (no persistent auth cookies without "remember me")

### Token Security

- [ ] Short-lived access tokens (5-15 minutes)
- [ ] Store refresh tokens securely (HttpOnly cookies or server-side)
- [ ] Implement refresh token rotation
- [ ] Implement token family invalidation on reuse detection
- [ ] Use RS256 or stronger signing algorithm
- [ ] Validate all JWT claims (iss, aud, exp, iat)
- [ ] Whitelist allowed algorithms in verification
- [ ] Implement token revocation/blocklist for immediate invalidation

### CSRF Protection

- [ ] Use SameSite cookies
- [ ] Implement CSRF tokens for state-changing operations
- [ ] Use signed double-submit cookies for stateless apps
- [ ] Validate Origin/Referer headers
- [ ] Require custom headers for API requests

### XSS Prevention

- [ ] Implement Content Security Policy (CSP)
- [ ] Use nonce-based CSP for inline scripts
- [ ] Output encode all user data
- [ ] Sanitize HTML input with DOMPurify
- [ ] Set `X-Content-Type-Options: nosniff`
- [ ] Use modern frameworks with auto-escaping

### Transport Security

- [ ] Use HTTPS everywhere
- [ ] Implement HSTS (HTTP Strict Transport Security)
- [ ] Use TLS 1.2+ (prefer TLS 1.3)
- [ ] Disable HTTP (or redirect to HTTPS)

### Monitoring & Logging

- [ ] Log authentication events (login, logout, failed attempts)
- [ ] Log session lifecycle events
- [ ] Monitor for concurrent session anomalies
- [ ] Detect impossible travel
- [ ] Alert on suspicious patterns
- [ ] Never log session IDs or tokens directly

### User Controls

- [ ] Allow users to view active sessions
- [ ] Allow users to terminate other sessions
- [ ] Notify users of new device logins
- [ ] Require re-authentication for sensitive operations
- [ ] Invalidate sessions on password change

---

## Sources

### Session vs JWT
- [JWTs vs. sessions: which authentication approach is right for you? - Stytch](https://stytch.com/blog/jwts-vs-sessions-which-is-right-for-you/)
- [JWT vs Session Authentication - DEV Community](https://dev.to/codeparrot/jwt-vs-session-authentication-1mol)
- [Combining the benefits of session tokens and JWTs - Clerk](https://clerk.com/blog/combining-the-benefits-of-session-tokens-and-jwts)
- [JWT Token vs Cookie Based Session Authentication - Ayush Sharma](https://heyayush.com/post/2024-08-13_jwt-token-vs-cookie-based-session-authentication-detailed-comparison)

### Cookie Security
- [Secure cookie configuration - MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
- [Cookie Security Guide - Barrion](https://barrion.io/blog/cookie-security-best-practices)
- [Using HTTP cookies - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Cookie Security: An Expert Guide - JScrambler](https://jscrambler.com/learning-hub/cookie-security)

### Refresh Token Rotation
- [The Developer's Guide to Refresh Token Rotation - Descope](https://www.descope.com/blog/post/refresh-token-rotation)
- [Refresh Token Rotation - Auth0](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [What Are Refresh Tokens and How to Use Them Securely - Auth0](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)

### Token Storage
- [Local Storage vs Cookies: Securely Store Session Tokens - Pivot Point Security](https://www.pivotpointsecurity.com/local-storage-versus-cookies-which-to-use-to-securely-store-session-tokens/)
- [Cookies vs LocalStorage for Sessions - SuperTokens](https://supertokens.com/blog/cookies-vs-localstorage-for-sessions-everything-you-need-to-know)
- [LocalStorage vs Cookies: JWT Token Storage - Cyber Chief](https://www.cyberchief.ai/2023/05/secure-jwt-token-storage.html)

### Session Management
- [Session Management - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Token Lifecycle Management - SkyCloak](https://skycloak.io/blog/jwt-token-lifecycle-management-expiration-refresh-revocation-strategies/)
- [10 Session Management Security Best Practices - Endgrate](https://endgrate.com/blog/10-session-management-security-best-practices)

### Remember Me
- [Spring Security - Persistent Remember Me - Baeldung](https://www.baeldung.com/spring-security-persistent-remember-me)
- [Remember-Me Authentication - Spring Security](https://docs.spring.io/spring-security/reference/servlet/authentication/rememberme.html)
- [PHP rememberme library - GitHub](https://github.com/gbirke/rememberme)

### Concurrent Sessions
- [Testing for Concurrent Sessions - OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/11-Testing_for_Concurrent_Sessions)
- [How to Track Multi-Device Sessions in Node.js - Seven Square Tech](https://www.sevensquaretech.com/multi-device-session-management-in-nodejs/)
- [How Spring Security Handles Concurrent Sessions - JavaThinking](https://www.javathinking.com/spring-security/how-spring-security-handles-concurrent-sessions/)

### Session Invalidation
- [Testing for Logout Functionality - OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/06-Testing_for_Logout_Functionality)
- [Session persistence after logout - Snyk Learn](https://learn.snyk.io/lesson/session-persistence/)

### CSRF Protection
- [Cross-Site Request Forgery Prevention - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern - Medium](https://medium.com/cross-site-request-forgery-csrf/double-submit-cookie-pattern-65bb71d80d9f)
- [CSRF Mitigation Techniques 2024 - ZCybersecurity](https://zcybersecurity.com/csrf-mitigation-techniques/)
- [csrf-csrf library - GitHub](https://github.com/Psifi-Solutions/csrf-csrf)

### XSS Prevention
- [Cross Site Scripting Prevention - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Mitigate XSS with strict CSP - web.dev](https://web.dev/articles/strict-csp)
- [Content Security Policy - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Defending against XSS with CSP - Auth0](https://auth0.com/blog/defending-against-xss-with-csp/)

### JWT Security
- [JWT Security Best Practices - Curity](https://curity.io/resources/learn/jwt-best-practices/)
- [JWT: Vulnerabilities, Attacks & Security Best Practices - Vaadata](https://www.vaadata.com/blog/jwt-json-web-token-vulnerabilities-common-attacks-and-security-best-practices/)
- [JWT Security Best Practices for 2025 - JWT.app](https://jwt.app/blog/jwt-best-practices/)
- [RFC 8725 - JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)

### BFF Pattern
- [The Backend for Frontend Pattern - Auth0](https://auth0.com/blog/the-backend-for-frontend-pattern-bff/)
- [Backend-for-Frontend Auth Guide - FusionAuth](https://fusionauth.io/blog/backend-for-frontend)
- [Backend For Frontend Security Framework - Duende Software](https://docs.duendesoftware.com/bff/)
- [OAuth 2.0 for Browser-Based Applications - IETF Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Token Handler Pattern - Curity](https://curity.io/resources/learn/the-token-handler-pattern/)

### Session Fingerprinting
- [Session Management Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Browser fingerprint binding - Connect2id](https://connect2id.com/products/server/docs/guides/user-agent-fingerprint-binding)
- [Session Hijacking Prevention - The Central Texas IT Guy](https://thecentexitguy.com/session-hijacking-prevention-technical-defenses-to-secure-session-tokens/)

---

*Last updated: December 2024*
