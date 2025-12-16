---
depends: []
---

# pnpm Workspaces

Monorepo management with pnpm workspaces. Multiple packages in a single repo sharing dependencies.

## workspace:* Protocol

Link internal packages using workspace protocol:

```json
{
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

Auto-converts to version on publish. Always use `workspace:*` for internal deps.

## Commands

```bash
# Run across ALL packages
pnpm -r <command>                        # Recursive - all workspaces
pnpm -r build                            # Build all packages
pnpm -r --parallel dev                   # Run dev in parallel

# Filter by pattern
pnpm --filter "./packages/**" build      # Glob pattern
pnpm --filter "@myorg/api" dev           # Specific package
pnpm --filter "!@myorg/docs" test        # Exclude package

# Add dependencies
pnpm add <package> --filter <workspace>  # To specific workspace
pnpm add <package> -w                    # To workspace root
pnpm add -D <package> -w                 # DevDep to root

# Other
pnpm -r exec <command>                   # Execute shell command in all
pnpm -r --filter <pattern> <command>     # Combine filter + recursive
```

## Filter Patterns

**Glob patterns:**
```bash
pnpm --filter "./packages/*" build       # All direct children
pnpm --filter "./packages/**" build      # All nested
pnpm --filter "!./packages/docs" build   # Exclude specific
```

**Package names:**
```bash
pnpm --filter @scope/api build           # Exact match
pnpm --filter "@scope/*" build           # Scope pattern
```

**Dependents:**
```bash
pnpm --filter ...@scope/core build       # Package + dependents
pnpm --filter @scope/core... build       # Package + dependencies
```

## pnpm-workspace.yaml

Define workspace packages:

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tools/*"
```

Place in repo root. pnpm uses this to discover workspaces.

## When to Use

- **Monorepos**: Multiple related packages/apps
- **Shared code**: Internal libraries used by multiple apps
- **Coordinated releases**: Packages that version together
- **Code reuse**: Extract common logic without npm publishing

## When NOT to Use

- **Single package**: No monorepo needed
- **Unrelated projects**: Use separate repos
- **Simple apps**: Single-package setup is simpler

## Key Concepts

**Hoisting**: Shared deps installed once at root, symlinked to packages.

**Phantom deps**: Packages can import deps not in their package.json. Use `public-hoist-pattern` in .npmrc to control.

**Strictness**: Use `--strict-peer-dependencies` to enforce proper dependency declarations.
