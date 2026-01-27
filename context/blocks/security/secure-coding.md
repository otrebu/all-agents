# Secure Coding

Security patterns based on OWASP Top 10: preventing injection attacks, XSS, authentication flaws, secrets exposure, and authorization vulnerabilities.

---

## Quick Reference

- Never concatenate user input into SQL, commands, or HTML—use parameterization.
- Sanitize user content before rendering; use framework escaping by default.
- Store secrets in environment variables, never in code.
- Validate and authorize on every request—don't trust client-side checks.
- Use strong, slow hashing (bcrypt/argon2) for passwords, not MD5/SHA1.

---

## Injection Vulnerabilities

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| String concat in SQL | SQL injection | Parameterized queries |
| User input in shell command | Command injection | Avoid shell; use APIs |
| Template string with user input | Template injection | Escape or sandbox |
| User input in regex | ReDoS | Escape special chars |

### Rules

- Use parameterized queries or prepared statements for all database access
- Never pass user input to shell commands; use language APIs instead
- If shell is unavoidable, use strict allowlists and escape carefully
- Validate and escape user input in templates

### Example

```typescript
// ❌ SQL Injection: User controls query structure
const query = `SELECT * FROM users WHERE id = '${userId}'`;
const user = await db.raw(query);

// ❌ Command Injection: User controls command
exec(`convert ${userFilename} output.png`);

// ❌ ReDoS: User-controlled regex can hang
const pattern = new RegExp(userInput);
text.match(pattern);

// ✅ Parameterized query: User input is data, not code
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ✅ Use library instead of shell
import sharp from 'sharp';
await sharp(userFilePath).toFile('output.png');

// ✅ Escape regex special characters
const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(escaped);
```

---

## Cross-Site Scripting (XSS)

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| innerHTML with user data | XSS via script injection | textContent or sanitize |
| dangerouslySetInnerHTML | XSS in React | DOMPurify or avoid |
| URL params reflected | Reflected XSS | Encode output |
| User data in href/onclick | XSS via javascript: URI | Validate URL scheme |

### Rules

- Use framework's default escaping (React JSX auto-escapes)
- When you must render HTML, sanitize with DOMPurify
- Validate URL schemes: only allow http://, https://
- Set Content-Security-Policy headers to limit script sources

### Example

```typescript
// ❌ XSS: User content executed as HTML
element.innerHTML = userComment;

// ❌ XSS: React dangerously bypasses escaping
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ❌ XSS: javascript: URI in link
<a href={userProvidedUrl}>Click</a>

// ✅ Safe: Text, not HTML
element.textContent = userComment;

// ✅ Safe: Sanitized HTML
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// ✅ Safe: Validated URL scheme
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
<a href={isSafeUrl(userUrl) ? userUrl : '#'}>Click</a>
```

---

## Authentication Issues

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Plain text password storage | Credential theft | bcrypt/argon2 hash |
| MD5/SHA1 for passwords | Rainbow table attacks | Slow hash with salt |
| No rate limiting on login | Brute force attacks | Rate limit auth endpoints |
| Session without expiry | Session hijacking | Short-lived + refresh |
| Hardcoded credentials | Credential exposure | Environment variables |

### Rules

- Hash passwords with bcrypt (cost ≥10) or argon2
- Rate limit authentication endpoints (e.g., 5 attempts per minute)
- Use short-lived tokens with refresh mechanism
- Implement CSRF protection for state-changing requests
- Never hardcode credentials—use environment variables

### Example

```typescript
// ❌ Plain text storage
await db.users.create({ password: userPassword });

// ❌ Fast hash easily cracked
const hash = crypto.createHash('md5').update(password).digest('hex');

// ❌ Hardcoded credentials
const API_KEY = 'sk-live-abc123xyz';

// ❌ No rate limiting on login
app.post('/login', async (req, res) => {
  // Attacker can try unlimited passwords
});

// ✅ Slow hash with salt
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);

// ✅ Verify with timing-safe comparison
const valid = await bcrypt.compare(inputPassword, storedHash);

// ✅ Environment variable for secrets
const API_KEY = process.env.API_KEY;

// ✅ Rate limited endpoint
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts
});
app.post('/login', loginLimiter, loginHandler);
```

---

## Secrets Exposure

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Secrets in source code | Leaked in repo | Environment variables |
| Secrets in config files | Leaked if file accessed | Env vars or secret manager |
| Secrets in logs | Visible in log aggregators | Redact before logging |
| Secrets in error messages | Exposed to users | Generic error messages |
| Secrets in URLs | Logged by proxies/browsers | Request body or headers |

### Rules

- Store all secrets in environment variables or secret managers
- Never commit .env files; add to .gitignore
- Redact secrets before logging: mask all but last 4 chars
- Return generic error messages to users; log details server-side
- Never put secrets in URLs (query params logged by servers/proxies)

### Example

```typescript
// ❌ Secret in code
const API_KEY = 'sk-live-abc123xyz';

// ❌ Secret in log
console.log(`Connecting with key: ${apiKey}`);

// ❌ Secret in error
throw new Error(`Auth failed for key: ${apiKey}`);

// ❌ Secret in URL
fetch(`/api?key=${apiKey}`);

// ✅ From environment
const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY required');

// ✅ Redacted in log
const masked = apiKey.slice(-4).padStart(apiKey.length, '*');
console.log(`Connecting with key: ${masked}`);

// ✅ Generic user error, detailed server log
try {
  await authenticate(key);
} catch (e) {
  console.error('Auth failed:', { keyLastFour: key.slice(-4) });
  throw new Error('Authentication failed'); // Generic to user
}

// ✅ Secret in header, not URL
fetch('/api', { headers: { Authorization: `Bearer ${token}` } });
```

---

## Authorization Flaws

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Missing ownership check | IDOR: access others' data | Verify user owns resource |
| Client-side only checks | Bypassed by attacker | Server-side validation |
| Role checked at login only | Privilege escalation | Check on every request |
| Direct object reference | Guessable IDs exploited | Ownership validation |

### Rules

- Verify ownership/permission on every request, not just login
- Never trust client-side authorization checks
- Use middleware to enforce access control consistently
- Prefer indirect references (UUIDs with ownership check) over sequential IDs

### Example

```typescript
// ❌ IDOR: No ownership check
app.get('/documents/:id', async (req, res) => {
  const doc = await db.documents.findById(req.params.id);
  res.json(doc); // Anyone can access any document
});

// ❌ Client-side only check
if (user.role === 'admin') {
  showDeleteButton();
}
// But server accepts delete from anyone!

// ✅ Ownership verified
app.get('/documents/:id', async (req, res) => {
  const doc = await db.documents.findById(req.params.id);
  if (doc.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(doc);
});

// ✅ Middleware enforces role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
app.delete('/users/:id', requireAdmin, deleteUser);
```

---

## Cryptographic Issues

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| MD5/SHA1 for passwords | Trivially cracked | bcrypt, argon2 |
| Hardcoded encryption key | Key exposure | Key management service |
| Math.random for security | Predictable | crypto.randomBytes |
| Custom crypto | Implementation flaws | Standard libraries |
| Sensitive data unencrypted | Data breach exposure | Encrypt at rest |

### Rules

- Use bcrypt or argon2 for password hashing (never MD5/SHA1/SHA256 alone)
- Use crypto.randomBytes or crypto.randomUUID for security tokens
- Store encryption keys in secret managers, not code
- Use well-tested crypto libraries; never implement your own

### Example

```typescript
// ❌ Weak hash for password
const hash = crypto.createHash('sha256').update(password).digest('hex');

// ❌ Predictable token
const token = Math.random().toString(36);

// ❌ Hardcoded key
const ENCRYPTION_KEY = 'my-secret-key-123';

// ✅ Strong password hash
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);

// ✅ Cryptographically secure token
import crypto from 'crypto';
const token = crypto.randomBytes(32).toString('hex');
// Or: crypto.randomUUID()

// ✅ Key from secret manager
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
```

---

## Input Validation

### Patterns

| Pattern | Risk | Safe Alternative |
|---------|------|------------------|
| Trust user input shape | Type confusion, injection | Schema validation |
| Path from user input | Path traversal | Validate, use basename |
| File upload without checks | Malicious file execution | Validate type, size, scan |
| JSON.parse without catch | Denial of service | Try-catch with limit |

### Rules

- Validate all input at system boundaries with schema validation (Zod, Joi)
- Never use user input directly in file paths; validate and sanitize
- Validate file uploads: check MIME type, extension, size; scan for malware
- Handle JSON parse errors; limit payload size

### Example

```typescript
// ❌ Path traversal: user controls path
const filePath = `./uploads/${req.params.filename}`;
// Attacker: ../../../etc/passwd

// ❌ No validation on upload
app.post('/upload', (req, res) => {
  req.file.mv(`./uploads/${req.file.name}`);
});

// ❌ Unvalidated JSON
const data = JSON.parse(req.body); // Can throw, no size limit

// ✅ Sanitized path
import path from 'path';
const filename = path.basename(req.params.filename); // Strips ../
const filePath = path.join('./uploads', filename);

// ✅ Validated upload
const allowedTypes = ['image/png', 'image/jpeg'];
const maxSize = 5 * 1024 * 1024; // 5MB
if (!allowedTypes.includes(req.file.mimetype)) {
  return res.status(400).json({ error: 'Invalid file type' });
}
if (req.file.size > maxSize) {
  return res.status(400).json({ error: 'File too large' });
}

// ✅ Safe JSON parsing with schema
import { z } from 'zod';
const schema = z.object({ name: z.string(), age: z.number() });
const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

---

## Common Gotchas

### Timing Attacks

```typescript
// ❌ Non-constant time comparison
if (userToken === storedToken) { ... }

// ✅ Constant time comparison
import crypto from 'crypto';
const match = crypto.timingSafeEqual(
  Buffer.from(userToken),
  Buffer.from(storedToken)
);
```

### Prototype Pollution

```typescript
// ❌ Merging user object can pollute prototype
Object.assign(config, userInput);
// userInput: { "__proto__": { "isAdmin": true } }

// ✅ Validate keys or use Map
const safeKeys = ['name', 'email'];
for (const key of safeKeys) {
  if (key in userInput) config[key] = userInput[key];
}
```

### Open Redirect

```typescript
// ❌ Redirect to user-provided URL
res.redirect(req.query.returnUrl);
// Attacker: ?returnUrl=https://evil.com

// ✅ Validate redirect is internal
const url = new URL(req.query.returnUrl, req.headers.origin);
if (url.origin !== req.headers.origin) {
  return res.status(400).json({ error: 'Invalid redirect' });
}
res.redirect(url.pathname);
```

---

## Summary: Checklist

Before shipping code, verify:

- [ ] All SQL queries use parameterized queries
- [ ] User input never concatenated into commands, templates, or HTML
- [ ] Passwords hashed with bcrypt/argon2 (not MD5/SHA1)
- [ ] Secrets stored in environment variables, not code
- [ ] Authorization checked on every request, server-side
- [ ] File paths validated; user input sanitized with path.basename
- [ ] Rate limiting on authentication endpoints
- [ ] CSP headers configured; XSS mitigations in place
- [ ] Sensitive data encrypted at rest and in transit
