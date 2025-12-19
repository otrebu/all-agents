---
tags: [monorepo, security]
---

# Environment Variables in Monorepo

Core patterns for managing environment variables in monorepo: shared root configuration with package-specific overrides. Runtime-agnostic concepts applicable to Node.js, Bun, and other runtimes.

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

## Further Reading

- `@context/foundations/security/secrets-env-typed.md` - Type-safe single-project config
- `@context/foundations/security/secrets-env-monorepo-node.md` - Node.js-specific monorepo patterns
- `@context/foundations/security/secrets-env-monorepo-bun.md` - Bun-specific monorepo patterns
- `@context/blocks/construct/zod.md` - Runtime validation
