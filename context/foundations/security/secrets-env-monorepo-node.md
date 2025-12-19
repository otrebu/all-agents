---
depends:
  - "@context/foundations/security/secrets-env-monorepo.md"
  - "@context/blocks/construct/node.md"
  - "@context/blocks/construct/pnpm.md"
tags: [monorepo, security]
---

# Environment Variables in Monorepo (Node.js)

Node.js-specific implementation of monorepo env patterns using `--env-file` flag for layered `.env` file loading.

**For file structure, validation, and when to use:** See `@context/foundations/security/secrets-env-monorepo.md`

This doc covers only Node.js-specific loading mechanisms.

## Loading with --env-file

Node.js requires explicit `--env-file` flags to load environment variables. Multiple flags enable layered loading.

**Root `.env` example:**

```bash
# .env (root)
DATABASE_URL=postgresql://localhost:5432/mydb
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

**Package `.env` example:**

```bash
# packages/api/.env
API_PORT=3000
API_KEY=sk_live_abc123
LOG_LEVEL=debug  # Override root
```

### package.json Scripts

```json
{
  "name": "@repo/api",
  "scripts": {
    "start": "node --env-file=../../.env --env-file=.env dist/index.js",
    "dev": "tsx --env-file=../../.env --env-file=.env src/index.ts"
  }
}
```

### Order Matters

**Later files override earlier files:**

```bash
node --env-file=../../.env --env-file=.env dist/index.js
# Root loaded first, package overrides
```

**Precedence**: CLI args > last `--env-file` > first `--env-file`

### pnpm Workspace Considerations

Running from different locations affects working directory:

```bash
# From root (CWD = monorepo root)
pnpm --filter @repo/api start
# Runs in packages/api/, relative paths work: ../../.env

# From package (CWD = packages/api)
cd packages/api && pnpm start
# Runs in packages/api/, same relative paths: ../../.env
```

**Recommendation**: Use relative paths in scripts for consistency across execution contexts.

## Alternative: dotenv Library

Explicit dotenv library provides more control:

```typescript
// packages/api/src/config.ts
import { config } from "dotenv";

// Load root first (shared)
config({ path: "../../.env" });

// Load package (overrides root)
config({ path: ".env", override: true });

// Now process.env has merged values
```

**Tradeoff**: More explicit but adds runtime dependency.

## Troubleshooting

### Environment variable not loaded

**Check working directory:**

```bash
# Add debug to scripts
"start": "pwd && node --env-file=../../.env --env-file=.env dist/index.js"
```

Paths are relative to CWD, not script location. Ensure CWD matches expected directory.

### Values not overriding

**Check file order in --env-file:**

```bash
# ❌ Wrong: package loaded first
node --env-file=.env --env-file=../../.env dist/index.js

# ✅ Right: root first, package overrides
node --env-file=../../.env --env-file=.env dist/index.js
```

### pnpm filter doesn't load package .env

**Verify CWD with pnpm filter:**

```bash
pnpm --filter @repo/api exec pwd
# Should show: /path/to/monorepo/packages/api
```

If CWD is wrong, adjust relative paths in `--env-file` flags accordingly.
