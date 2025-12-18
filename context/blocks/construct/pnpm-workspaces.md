# pnpm Workspaces

Monorepo management with pnpm workspaces. Multiple packages in a single repo sharing dependencies.

## workspace:\* Protocol

Link internal packages using workspace protocol.

In **package.json**:

```json
{
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

Auto-converts to version on publish. Variants:

- `workspace:*` → exact version on publish
- `workspace:^` → `^version` on publish (allows minor updates)
- `workspace:~` → `~version` on publish (allows patch updates)

Always use `workspace:` protocol for internal deps.

## Commands

```bash
# Run across ALL packages
pnpm -r <command>                        # Recursive - all workspaces
pnpm -r build                            # Build all packages
pnpm -r --parallel dev                   # Run dev in parallel
pnpm -r --stream dev                     # Parallel with interleaved output (better for debugging)

# Filter by pattern (-F is shorthand for --filter)
pnpm -F "./packages/**" build            # Glob pattern
pnpm -F "@myorg/api" dev                 # Specific package
pnpm -F "!@myorg/docs" test              # Exclude package

# Add dependencies
pnpm add <package> -F <workspace>        # To specific workspace
pnpm add <package> -w                    # To workspace root
pnpm add -D <package> -w                 # DevDep to root

# Other
pnpm -r exec <command>                   # Execute shell command in all
pnpm -r -F <pattern> <command>           # Combine filter + recursive
```

## Filter Patterns

**Glob patterns:**

```bash
pnpm -F "./packages/*" build             # All direct children
pnpm -F "./packages/**" build            # All nested
pnpm -F "!./packages/docs" build         # Exclude specific
```

**Package names:**

```bash
pnpm -F @scope/api build                 # Exact match
pnpm -F "@scope/*" build                 # Scope pattern
```

**Dependents/dependencies:**

```bash
pnpm -F "...@scope/core" build           # Package + its dependents (things that depend on it)
pnpm -F "@scope/core..." build           # Package + its dependencies (things it depends on)
```

## pnpm-workspace.yaml

Defines workspace root and controls which directories are included/excluded. Place in repo root.

### packages

Glob patterns defining workspace locations (required). Root package always included.

```yaml
packages:
  - "packages/*" # All direct children
  - "apps/**" # All nested packages
  - "!**/test/**" # Exclude test dirs
```

### catalog / catalogs

Shared dependency versions across workspace. Reduces duplication, ensures consistency.

**Define in pnpm-workspace.yaml:**

```yaml
catalog:
  chalk: ^4.1.2
  lodash: ^4.17.21

catalogs:
  react17:
    react: ^17.0.0
    react-dom: ^17.0.0
  react18:
    react: ^18.0.0
    react-dom: ^18.0.0
```

**Consume in package.json:**

```json
{
  "dependencies": {
    "chalk": "catalog:",
    "lodash": "catalog:",
    "react": "catalog:react18",
    "react-dom": "catalog:react18"
  }
}
```

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

**Symlinked store**: pnpm uses a content-addressable store with symlinks. In workspaces, shared dependencies are installed once and symlinked where needed — different from npm/yarn's hoisting.

**Isolation by default**: Packages can only import dependencies declared in their own package.json. This prevents "phantom dependencies" (importing undeclared deps that happen to be installed by siblings) — a common problem with npm/yarn that pnpm solves.

**Strictness**: Use `--strict-peer-dependencies` to enforce proper peer dependency declarations across the workspace.
