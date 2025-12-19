---
depends:
  - "@context/foundations/security/secrets-env-monorepo.md"
  - "@context/blocks/construct/bun.md"
tags: [monorepo, security]
---

# Environment Variables in Monorepo (Bun)

Bun-specific implementation of monorepo env patterns using automatic `.env` loading and directory tree search.

**For file structure, validation, and when to use:** See `@context/foundations/security/secrets-env-monorepo.md`

This doc covers only Bun-specific loading mechanisms.

## Automatic Loading

Bun auto-loads `.env` files without requiring explicit flags.

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

No `--env-file` flags needed:

```json
{
  "name": "@repo/api",
  "scripts": {
    "start": "bun run dist/index.js",
    "dev": "bun run src/index.ts"
  }
}
```

### Search Behavior

Bun searches for `.env` files automatically:

1. Loads `.env` from **current working directory**
2. Searches **parent directories** for additional `.env` files
3. Files **closer to CWD take precedence**

```bash
# From packages/api/
bun run src/index.ts
# Loads: packages/api/.env (first), then .env (root)
# Package values override root
```

### Variable Expansion

Bun supports `$VAR` syntax for referencing other variables:

```bash
# .env (root)
BASE_URL=https://api.example.com
API_ENDPOINT=$BASE_URL/v1
FULL_PATH=$BASE_URL/v1/users
```

Useful for composing URLs and paths from base values.

## Troubleshooting

### Bun not loading root .env

**Check directory structure:**

Bun searches up from CWD. Verify root `.env` exists:

```bash
cd packages/api
ls ../../.env  # Should exist
bun run src/index.ts
```

If missing, create root `.env` file.

### Search path verification

**Debug which .env files Bun loads:**

```bash
# From package directory
cd packages/api
ls -la .env         # Package .env
ls -la ../../.env   # Root .env
```

Both should exist for layered loading.
