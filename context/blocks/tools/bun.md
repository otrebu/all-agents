---
depends: []
---

# Bun

All-in-one JavaScript/TypeScript toolkit: runtime + package manager + bundler + test runner.

## Overview

- **Runtime**: Runs JS/TS directly (native TS, no tsc needed for execution)
- **Package Manager**
- **Bundler**: Built-in, fast (simple projects, CLI tools)
- **Test Runner**: Jest-compatible

## Package Manager

```bash
# Install dependencies
bun install                          # Install all from package.json
bun ci                               # CI mode: exact versions, fails on mismatch
bun install --frozen-lockfile        # Same as bun ci
bun install --production             # Skip devDependencies
bun install --omit=dev --omit=peer   # Skip specific dep types

# Add/remove packages
bun add <package>                    # Add to dependencies
bun add -d <package>                 # Add to devDependencies
bun add -g <package>                 # Install globally
bun add github:user/repo             # From GitHub
bun add git+https://url.git          # From Git
bun remove <package>                 # Remove package

# Update
bun update                           # Update all
bun update <package>                 # Update specific
bun outdated                         # Show outdated packages

# Execute packages (like npx)
bunx <package>                       # Run package binary
bunx --bun vite                      # Force Bun runtime

# Info & analysis
bun pm ls                            # List installed packages
bun pm cache                         # Show cache info
bun why <package>                    # Why is package installed?
bun audit                            # Security audit

# Linking & publishing
bun link                             # Link local package globally
bun link <package>                   # Link global package locally
bun publish                          # Publish to npm
```

**Security**: Bun skips lifecycle scripts by default. Allow specific packages:

```json
{
  "trustedDependencies": ["esbuild", "sharp"]
}
```

**pnpm migration**: Bun auto-converts `pnpm-lock.yaml` → `bun.lock` on first install.

## Runtime

```bash
# Run scripts
bun run <script>                     # Run package.json script
bun <script>                         # Shorthand
bun run index.ts                     # Run TypeScript directly

# Execute files
bun ./src/index.ts                   # Native TS execution
bun ./script.js                      # Run JS

# REPL (not available - use node for REPL)
```

**Native TypeScript**: Bun executes `.ts` files directly without compilation. No `ts-node` or build step needed for development

## TypeScript with Bun

Bun runs TS natively but **does not type-check**. For type safety:

```bash
# Type-check only (no emit)
tsc --noEmit

# Or in package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "bun build ./src/index.ts --outdir ./dist"
  }
}
```

**tsconfig.json for Bun:**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "noEmit": true
  }
}
```

Install types: `bun add -d bun-types`

## Bundler

```bash
# Basic build
bun build ./src/index.ts --outdir ./dist

# With options
bun build ./src/index.ts \
  --outdir ./dist \
  --target node \
  --minify \
  --sourcemap

# Executable (single file)
bun build ./src/cli.ts --compile --outfile ./bin/mycli
```

**When to use Bun build:**

- CLI tools, simple projects
- Fast iteration, no complex plugins needed

**When to use Vite instead:**

- Complex frontends needing HMR
- Extensive plugin ecosystem required
- Production optimization for web apps

## Test Runner

```bash
# Run tests
bun test                             # Run all tests
bun test <file>                      # Run specific file
bun test --watch                     # Watch mode
bun test --coverage                  # With coverage

# Filtering
bun test --grep "pattern"            # Filter by name
bun test path/to/tests               # Filter by path
```

**Jest compatibility**: Most Jest APIs work (`describe`, `it`, `expect`, `beforeEach`, etc.). Mocking via `bun:test`.

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("example", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Workspaces

**bunfig.toml** (or in package.json):

```toml
[workspace]
packages = ["packages/*"]
```

**package.json** alternative:

```json
{
  "workspaces": ["packages/*"]
}
```

**Commands:**

```bash
# Install all workspace deps
bun install

# Add to specific workspace
bun add <package> --cwd packages/target

# Run in workspace
bun run --cwd packages/target <script>

# Run across all workspaces
bun run --filter '*' <script>
```

**Internal dependencies:**

```json
{
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

## Configuration (bunfig.toml)

```toml
# Package manager
[install]
auto = true                          # Auto-install on bun run
frozen-lockfile = false              # Lock lockfile in CI

# Test runner
[test]
coverage = true
coverageDir = "coverage"

# Bundle
[bundle]
entryPoints = ["./src/index.ts"]
outdir = "./dist"
```

## When to Use Bun vs Alternatives

| Scenario                      | Use            |
| ----------------------------- | -------------- |
| Greenfield project, max speed | Bun            |
| Complex frontend w/ HMR       | Vite + Vitest  |
| Enterprise, full Node compat  | Node + pnpm    |
| Serverless, fast cold starts  | Bun            |
| Existing large Node codebase  | Stay with Node |

**Bun limitations:**

- ~5% missing Node APIs (edge cases, native addons)
- No REPL (use `node` for quick experiments)
- No built-in linter/formatter (use ESLint/Prettier)
- Vite HMR support incomplete
- Some npm packages have edge case issues
- Limited edge/serverless platform support (Cloudflare Workers uses V8)
