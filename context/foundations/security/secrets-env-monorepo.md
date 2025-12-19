---
depends:
  - "@context/blocks/construct/node.md"
  - "@context/blocks/construct/bun.md"
  - "@context/blocks/construct/zod.md"
tags: [monorepo, security]
---

# Environment Variables in Monorepo

Managing environment variables in monorepo: shared root configuration with package-specific overrides.

## Use Cases

- **Shared infrastructure**: Database URL, Redis connection used by all packages
- **Package-specific secrets**: Different API keys per service (payments, email, analytics)
- **Per-package overrides**: Port numbers, host configs, feature flags

## File Structure

```
monorepo/
├── .env                    # Root: shared across all packages (gitignored)
├── .env.dev                # Root template (committed, safe defaults)
├── packages/
│   ├── api/
│   │   ├── .env           # Package-specific overrides (gitignored)
│   │   ├── .env.dev       # Package template (committed)
│   │   └── src/
│   │       └── config.ts  # Zod validation
│   └── worker/
│       ├── .env           # Package-specific overrides (gitignored)
│       └── .env.dev       # Package template (committed)
└── .gitignore             # *.env but NOT *.env.dev
```

### .gitignore

```gitignore
# Ignore actual secrets
.env
.env.local

# Commit templates
!.env.dev
!.env.*.dev
```

### Precedence

**Loading order** (last wins):
1. Root `.env` (shared defaults)
2. Package `.env` (package-specific overrides)
3. CLI arguments (highest priority)

## Runtime-Specific Loading

### Node.js with `--env-file`

Node.js supports multiple `--env-file` flags for layered loading.

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

**package.json scripts:**

```json
{
  "name": "@repo/api",
  "scripts": {
    "start": "node --env-file=../../.env --env-file=.env dist/index.js",
    "dev": "tsx --env-file=../../.env --env-file=.env src/index.ts"
  }
}
```

**Order matters**: Later files override earlier ones.

### Bun (automatic)

Bun auto-loads `.env` files without flags.

**Search behavior:**
1. Loads `.env` from current working directory
2. Searches parent directories for additional `.env` files
3. Files closer to CWD take precedence

**package.json scripts:**

```json
{
  "name": "@repo/api",
  "scripts": {
    "start": "bun run dist/index.js",
    "dev": "bun run src/index.ts"
  }
}
```

**Variable expansion:**

Bun supports `$VAR` syntax for referencing other variables:

```bash
# .env
BASE_URL=https://api.example.com
API_ENDPOINT=$BASE_URL/v1
```

### pnpm Workspaces

Running from root vs package affects working directory:

```bash
# From root (CWD = root)
pnpm --filter @repo/api start
# Loads: root .env, then packages/api/.env

# From package (CWD = packages/api)
cd packages/api && pnpm start
# Loads: packages/api/.env, then searches up to root .env
```

**Recommendation**: Use relative paths in `--env-file` for consistency.

## Validation with Zod

Use Zod for type-safe, validated config. Pattern from `@context/foundations/security/secrets-env.md`.

### Root Config

```typescript
// packages/api/src/config.ts
import { z } from "zod"

const envSchema = z.object({
  // From root .env (shared)
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // From package .env (package-specific)
  API_PORT: z.coerce.number().min(1000).default(3000),
  API_KEY: z.string().min(1),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Invalid environment variables:")
  console.error(parsed.error.format())
  process.exit(1)
}

export const config = parsed.data
// Type: { DATABASE_URL: string, REDIS_URL: string, ... }
```

### Usage

```typescript
// packages/api/src/index.ts
import { config } from "./config.js"

// Type-safe access
console.log(config.DATABASE_URL)  // ✅ string
console.log(config.API_PORT)      // ✅ number

// Never access process.env directly elsewhere
```

### Template Files

**Root `.env.dev` (committed):**

```bash
# .env.dev - Safe defaults for development
DATABASE_URL=postgresql://localhost:5432/mydb_dev
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=debug
```

**Package `.env.dev` (committed):**

```bash
# packages/api/.env.dev - Package-specific template
API_PORT=3000
API_KEY=sk_test_placeholder_replace_me
```

**Developers copy:**

```bash
# Setup script or manual
cp .env.dev .env
cp packages/api/.env.dev packages/api/.env
# Then edit .env files with real values
```

## When to Use Layered .env

### ✅ Use layered .env when:

- **Shared infrastructure**: All packages need same DB/Redis/queue connection
- **Package-specific secrets**: Each service has different API keys/tokens
- **Per-package overrides**: Different ports, feature flags, debug levels
- **Large monorepo**: 5+ packages with varying config needs

### ❌ Use single root .env when:

- **Simple monorepo**: 2-3 packages with identical config
- **Centralized secrets**: Using vault/secret manager (env vars just point to vault)
- **All packages identical**: Same config across all packages

### Alternative: dotenv with Explicit Paths

If you prefer explicit dotenv library:

```typescript
// packages/api/src/config.ts
import { config } from "dotenv"

// Load root first (shared)
config({ path: "../../.env" })

// Load package (overrides root)
config({ path: ".env", override: true })

// Now process.env has merged values
```

**Tradeoff**: More explicit but requires dotenv dependency.

## Troubleshooting

### Environment variable not loaded

**Check working directory:**

```bash
# Add debug to scripts
"start": "pwd && node --env-file=../../.env --env-file=.env dist/index.js"
```

Paths are relative to CWD, not script location.

### Values not overriding

**Check file order:**

```bash
# Wrong: package loaded first
node --env-file=.env --env-file=../../.env dist/index.js

# Right: root first, package overrides
node --env-file=../../.env --env-file=.env dist/index.js
```

### Bun not loading root .env

**Check directory structure:**

Bun searches up from CWD. If running from package, it should find root `.env`. Verify:

```bash
cd packages/api
ls ../../.env  # Should exist
bun run src/index.ts
```

### pnpm filter doesn't load package .env

**Check CWD with pnpm filter:**

```bash
pnpm --filter @repo/api exec pwd
# Should show: /path/to/monorepo/packages/api
```

If wrong, paths in `--env-file` may be incorrect.

## Further Reading

- `@context/foundations/security/secrets-env.md` - Single-project env strategy
- `@context/blocks/construct/node.md` - Node.js `--env-file` flag
- `@context/blocks/construct/bun.md` - Bun auto-loading behavior
- `@context/blocks/construct/zod.md` - Runtime validation
